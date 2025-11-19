const sequelize = require('../config/db');


const User = require('./user');
const Survey = require('./survey');
const Question = require('./question');
const Option = require('./option');
const Submission = require('./submission');
const Response = require('./response');


// User <-> Survey (One-to-Many)
// A User can create many Surveys.
// A Survey belongs to one creator User.
User.hasMany(Survey, { foreignKey: 'creator_user_id' });
Survey.belongsTo(User, { foreignKey: 'creator_user_id' });

// Survey <-> Question (One-to-Many)
// A Survey has many Questions.
// A Question belongs to one Survey.
Survey.hasMany(Question, { foreignKey: 'survey_id' });
Question.belongsTo(Survey, { foreignKey: 'survey_id' });

// Question <-> Option (One-to-Many)
// A Question (if multiple_choice/checkbox) has many Options.
// An Option belongs to one Question.
Question.hasMany(Option, { foreignKey: 'question_id' });
Option.belongsTo(Question, { foreignKey: 'question_id' });

// Survey <-> Submission (One-to-Many)
// A Survey has many Submissions.
// A Submission belongs to one Survey.
Survey.hasMany(Submission, { foreignKey: 'survey_id' });
Submission.belongsTo(Survey, { foreignKey: 'survey_id' });

// User <-> Submission (One-to-Many, Nullable)
// A User can make many Submissions.
// A Submission belongs to one User (but can be null for anonymous).
User.hasMany(Submission, { foreignKey: 'user_id' });
Submission.belongsTo(User, { foreignKey: 'user_id' });

// Submission <-> Response (One-to-Many)
// A Submission has many Responses.
// A Response belongs to one Submission.
Submission.hasMany(Response, { foreignKey: 'submission_id' });
Response.belongsTo(Submission, { foreignKey: 'submission_id' });

// Question <-> Response (One-to-Many)
// A Question has many Responses.
// A Response belongs to one Question.
Question.hasMany(Response, { foreignKey: 'question_id' });
Response.belongsTo(Question, { foreignKey: 'question_id' });

// Option <-> Response (One-to-Many, Nullable)
// A Response belongs to one selected Option (if not short_answer).
Option.hasMany(Response, { foreignKey: 'selected_option_id' });
Response.belongsTo(Option, { foreignKey: 'selected_option_id' });

// Note: Indexes are defined in the model definitions (question.js and option.js)
// They will be created automatically when the database is synced

const db = {
    sequelize,
    User,
    Survey,
    Question,
    Option,
    Submission,
    Response
};

module.exports = db;