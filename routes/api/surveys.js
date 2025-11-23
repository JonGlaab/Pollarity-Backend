const router = require('express').Router();
const db = require('../../models');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const { authenticateJWT, checkBanned } = require('../../middleware/auth')
const passport = require('passport');
const { Op } = require('sequelize');

const { Survey, Question, Option, Submission, Response, sequelize } = db;

// Utility to generate a nice_url (UUID-like, 32 chars long)
const { v4: uuidv4 } = require('uuid');

// POST /api/surveys: CREATE A NEW SURVEY
router.post('/', [authenticateJWT,checkBanned], async (req, res) => {

    const { title, description, status, is_public, questions } = req.body;

    const creator_user_id = req.user.user_id;

    if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: "Survey must have a title and at least one question." });
    }

    const t = await sequelize.transaction();

    try {

        const newSurvey = await Survey.create({
            title,
            description,
            status: status === 'published' ? 'published' : 'draft',
            is_public,
            creator_user_id, // FK is required
            nice_url: uuidv4().replace(/-/g, ''), // Generate a 32-char UUID for the nice_url
            publishedAt: status === 'published' ? new Date() : null,
        }, { transaction: t });

        const survey_id = newSurvey.survey_id;

        for (const question of questions) {

            const newQuestion = await Question.create({
                survey_id,
                question_text: question.question_text,
                question_type: question.question_type,
                question_order: question.question_order,
                is_required: question.is_required,
            }, { transaction: t });

            if (question.options && question.options.length > 0) {
                const optionsToSave = question.options.map((option, optIndex) => ({
                    question_id: newQuestion.question_id,
                    option_text: option.option_text,
                    option_order: optIndex + 1,
                }));

                await Option.bulkCreate(optionsToSave, { transaction: t });
            }
        }

        await t.commit();

        return res.status(201).json({
            message: "Survey successfully created.",
            survey_id: survey_id,
            nice_url: newSurvey.nice_url
        });

    } catch (error) {
        // If any error occurs, rollback the transaction (undo all changes)
        await t.rollback();
        console.error("Sequelize Survey Creation Transaction Failed:", error);

        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(e => e.message);
            return res.status(400).json({ error: "Validation failed.", details: errors });
        }

        return res.status(500).json({ error: "Failed to create survey due to a server error." });
    }
});

// GET /api/surveys/participated: Fetch current user's history
router.get('/participated', [authenticateJWT, checkBanned], async (req, res) => {
    try {
        const userId = req.user.user_id;

        const submissions = await Submission.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Survey,
                    attributes: ['title', 'description', 'nice_url', 'createdAt']
                },
                {
                    model: Response,
                    include: [
                        {
                            model: Question,
                            attributes: ['question_text', 'question_type']
                        },
                        {
                            model: Option,
                            attributes: ['option_text']
                        }
                    ]
                }
            ],
            order: [['submitted_at', 'DESC']]
        });

        // Format the data for the frontend
        const history = submissions.map(sub => ({
            submission_id: sub.submission_id,
            date: sub.submitted_at,
            survey_title: sub.Survey.title,
            survey_desc: sub.Survey.description,
            answers: sub.Responses.map(r => ({
                question: r.Question.question_text,
                type: r.Question.question_type,
                // If it's multiple choice, get the option text; otherwise get the text response
                response: ['multiple_choice', 'checkbox'].includes(r.Question.question_type)
                    ? (r.Option ? r.Option.option_text : '(Option deleted)')
                    : r.response_text
            }))
        }));

        res.json(history);

    } catch (error) {
        console.error("Error fetching participation history:", error);
        res.status(500).json({ error: "Failed to fetch your survey history." });
    }
});

// GET /api/surveys: FETCH PUBLISHED SURVEYS (Home.js dependency)
router.get('/', async (req, res) => {
    try {
        const surveys = await Survey.findAll({
            where: {
                [Op.and]: [{ status: 'published' }, { is_public: true }]
            },
            attributes: ['survey_id', 'title', 'createdAt', 'nice_url'],
            include: [{ model: db.User, attributes: ['first_name', 'last_name'] }],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json(surveys);
    } catch (error) {
        console.error("Error fetching surveys:", error);
        return res.status(500).json({ error: "Failed to fetch surveys." });
    }
});

//>>>>>
// GET /api/surveys/nice/:nice_url - Public: fetch a published survey by its nice_url
router.get('/:niceUrl', async (req, res) => {
    try {
        const { niceUrl } = req.params;
        const survey = await Survey.findOne({
            where: { nice_url: niceUrl, status: 'published' },
            include: [
                {
                    model: Question,
                    include: [Option],
                    order: [['question_order', 'ASC']]
                },
                {
                    model: db.User,
                    attributes: ['first_name', 'last_name']
                }
            ]
        });

        if (!survey) return res.status(404).json({ error: 'Survey not found or not published' });

        return res.json(survey);
    } catch (error) {
        console.error('Error fetching survey by nice_url:', error);
        return res.status(500).json({ error: 'Failed to fetch survey' });
    }
});

// POST /api/surveys/:niceUrl/submit - Public: submit responses to a survey
router.post('/:niceUrl/submit', async (req, res, next) => {
    try {
        const { niceUrl } = req.params;
        const { answers } = req.body; // expected: array of { question_id, selected_option_id?, response_text? }

        const survey = await Survey.findOne({ where: { nice_url: niceUrl, status: 'published' } });
        if (!survey) return res.status(404).json({ error: 'Survey not found or not accepting responses' });

        // Try to authenticate user if token present (optional)
        passport.authenticate('jwt', { session: false }, async (err, user) => {
            if (err) return next(err);
            const t = await sequelize.transaction();
            try {
                const submissionData = { survey_id: survey.survey_id };
                if (user) submissionData.user_id = user.user_id;

                const newSubmission = await Submission.create(submissionData, { transaction: t });

                // normalize answers array and create Response rows
                if (Array.isArray(answers)) {
                    for (const a of answers) {
                        // a may represent a single response (for radio/text) or multiple (for checkboxes we expect multiple entries)
                        const responseRow = {
                            submission_id: newSubmission.submission_id,
                            question_id: a.question_id,
                            response_text: a.response_text || null,
                            selected_option_id: a.selected_option_id || null
                        };
                        await Response.create(responseRow, { transaction: t });
                    }
                }

                // mark survey has_answers true
                if (!survey.has_answers) {
                    survey.has_answers = true;
                    await survey.save({ transaction: t });
                }

                await t.commit();
                return res.status(201).json({ message: 'Submission saved' });
            } catch (error) {
                await t.rollback();
                console.error('Error saving submission:', error);
                return res.status(500).json({ error: 'Failed to save submission' });
            }
        })(req, res, next);

    } catch (error) {
        console.error('Submission endpoint error:', error);
        return res.status(500).json({ error: 'Failed to process submission' });
    }
});
//>>>>>

// GET /api/surveys/:id/results: FETCH ANALYTICS
router.get('/:id/results', authenticateJWT, async (req, res) => {
    try {
        const surveyId = req.params.id;
        const userId = req.user.user_id;


        const survey = await Survey.findOne({
            where: { survey_id: surveyId },
            include: [
                {
                    model: Question,
                    include: [Option]
                }
            ]
        });

        if (!survey) {
            return res.status(404).json({ error: "Survey not found" });
        }


        if (survey.creator_user_id !== userId) {
            return res.status(403).json({ error: "Access denied. You are not the creator of this survey." });
        }



        const submissions = await Submission.findAll({
            where: { survey_id: surveyId },
            attributes: ['submitted_at'],
            order: [['submitted_at', 'ASC']],
            raw: true
        });

        const submissionDates = submissions.map(s => s.submitted_at);



        const results = await Promise.all(survey.Questions.map(async (question) => {
            const questionData = {
                question_id: question.question_id,
                question_text: question.question_text,
                question_type: question.question_type,
                answers: []
            };

            if (['multiple_choice', 'checkbox'].includes(question.question_type)) {

                const optionCounts = await Response.findAll({
                    attributes: [
                        'selected_option_id',
                        [sequelize.fn('COUNT', sequelize.col('response_id')), 'count']
                    ],
                    where: { question_id: question.question_id },
                    group: ['selected_option_id'],
                    raw: true
                });


                questionData.answers = question.Options.map(opt => {
                    const found = optionCounts.find(c => c.selected_option_id === opt.option_id);
                    return {
                        option_text: opt.option_text,
                        count: found ? parseInt(found.count) : 0
                    };
                });

            } else if (question.question_type === 'short_answer') {
                const textResponses = await Response.findAll({
                    where: { question_id: question.question_id },
                    attributes: ['response_text'],
                    limit: 50,
                    order: [['response_id', 'DESC']]
                });
                questionData.answers = textResponses.map(r => r.response_text);
            }

            return questionData;
        }));

        res.json({
            survey: {
                title: survey.title,
                description: survey.description,
                total_submissions: submissionDates.length,
                createdAt: survey.createdAt,
                submission_dates: submissionDates
            },
            results: results
        });

    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: "Failed to fetch survey results" });
    }
});

//GET DATA TO EXPORT
const fetchSurveyRawData = async (surveyId, userId, userRole) => {
    const survey = await Survey.findOne({
        where: { survey_id: surveyId },
        include: [{ model: Question, order: [['question_order', 'ASC']] }]
    });
    if (!survey) {
        throw new Error("Survey not found");
    }
    if (survey.creator_user_id !== userId ){
        throw new Error("Access denied. You are not the creator of this survey.");
    }
    const submissions = await Submission.findAll({
        where: { survey_id: surveyId },
        include: [
            {
                model: Response,
                include: [Option]
            },
            {
                model: db.User,
                attributes: ['email']
            }
        ],
        order: [['submitted_at', 'DESC']]
    });
    return { survey, submissions };

}

//EXPORT TO CSV
router.get('/:id/export/csv', [authenticateJWT, checkBanned], async (req, res) => {
    try {

        const { survey, submissions } = await fetchSurveyRawData(req.params.id, req.user.user_id);

        if (submissions.length === 0) return res.status(400).json({ error: "No data to export" });

        const dataToExport = submissions.map(sub => {
            const row = {
                "Submission ID": sub.submission_id,
                "Date": new Date(sub.submitted_at).toLocaleDateString(),
                "User": sub.User ? sub.User.email : "Anonymous"
            };

            survey.Questions.forEach(q => {
                const responses = sub.Responses.filter(r => r.question_id === q.question_id);
                let answerText = "";

                if (responses.length > 0) {
                    if (['multiple_choice', 'checkbox'].includes(q.question_type)) {
                        answerText = responses.map(r => r.Option ? r.Option.option_text : "").join(", ");
                    } else {
                        answerText = responses[0].response_text || "";
                    }
                }
                row[q.question_text] = answerText;
            });
            return row;
        });

        const fields = ["Submission ID", "Date", "User", ...survey.Questions.map(q => q.question_text)];
        const parser = new Parser({ fields });
        const csv = parser.parse(dataToExport);

        res.header('Content-Type', 'text/csv');
        res.attachment(`survey_${survey.survey_id}_results.csv`);
        return res.send(csv);

    } catch (error) {
        console.error("CSV Export Error:", error);
        res.status(500).json({ error: error.message });
    }
});

//EXPORT TO EXCEL
router.get('/:id/export/excel', [authenticateJWT, checkBanned], async (req, res) => {
    try {

        const { survey, submissions } = await fetchSurveyRawData(req.params.id, req.user.user_id);
        if (submissions.length === 0) return res.status(400).json({ error: "No data to export" });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Survey Grid');

        // --- ROW 1: HEADERS (Metric + Response #1, Response #2...) ---
        const headerRow = ['METRIC / QUESTION'];
        submissions.forEach((_, index) => headerRow.push(`Response #${index + 1}`));

        const row1 = worksheet.addRow(headerRow);
        row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B263B' } }; // Brand Color

        // --- METADATA ROWS (Date, User) ---
        const dateRow = ['Submission Date'];
        const userRow = ['User'];

        submissions.forEach(sub => {
            dateRow.push(new Date(sub.submitted_at).toLocaleDateString());
            userRow.push(sub.User ? sub.User.email : "Anonymous");
        });

        worksheet.addRow(dateRow);
        worksheet.addRow(userRow);
        worksheet.addRow([]);

        // --- QUESTION ROWS (Questions as Rows, Answers in Columns) ---
        survey.Questions.forEach(q => {
            const row = [q.question_text]; // Column A is the Question

            submissions.forEach(sub => {
                const responses = sub.Responses.filter(r => r.question_id === q.question_id);
                let answerText = "";

                if (responses.length > 0) {
                    if (['multiple_choice', 'checkbox'].includes(q.question_type)) {
                        answerText = responses.map(r => r.Option ? r.Option.option_text : "").join(", ");
                    } else {
                        answerText = responses[0].response_text || "";
                    }
                }
                row.push(answerText);
            });

            const newRow = worksheet.addRow(row);
            newRow.getCell(1).font = { bold: true }; // Bold the Question text
        });

        // Formatting: Auto-width for first column
        worksheet.getColumn(1).width = 45;

        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`survey_${survey.survey_id}_grid.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Excel Export Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;