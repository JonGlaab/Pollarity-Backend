const router = require('express').Router();
const db = require('../../models');
const { authenticateJWT } = require('../../middleware/auth');

// temporary mock middleware
const mockAuth = require('../../middleware/mockAuth');
////////////////////////////

const { Survey, Question, Option, sequelize } = db;

// Utility to generate a nice_url (UUID-like, 32 chars long)
const { v4: uuidv4 } = require('uuid');

// POST /api/surveys: CREATE A NEW SURVEY
router.post('/', mockAuth, async (req, res) => { //Change mockAuth back to authenticateJWT for prod

    const { title, description, status, questions } = req.body;

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

// GET /api/surveys: FETCH PUBLISHED SURVEYS (Home.js dependency)
router.get('/', mockAuth, async (req, res) => {
    try {
        const surveys = await Survey.findAll({
            where: { status: 'published' },
            attributes: ['survey_id', 'title', 'createdAt'],
            include: [{ model: db.User, attributes: ['first_name', 'last_name'] }],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json(surveys);
    } catch (error) {
        console.error("Error fetching surveys:", error);
        return res.status(500).json({ error: "Failed to fetch surveys." });
    }
});

module.exports = router;