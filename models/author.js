const mongoose = require('mongoose');
const format = require('date-fns/format');

const { Schema } = mongoose;

function getParsedDate(date, dateFormat) {
  return format(Date.parse(date), dateFormat);
}

const AuthorSchema = new Schema(
  {
    first_name: { type: String, required: true, maxlength: 100 },
    family_name: { type: String, required: true, maxlength: 100 },
    date_of_birth: { type: Date },
    date_of_death: { type: Date },
  },
);

// Virtual for author's full name
AuthorSchema
  .virtual('name')
  .get(function getName() {
    return `${this.family_name}, ${this.first_name}`;
  });

// Virtual for author's URL
AuthorSchema
  .virtual('url')
  .get(function getUrl() {
    return `/catalog/author/${this._id}`;
  });

// Virtual for author's lifespan
AuthorSchema
  .virtual('lifespan')
  .get(function getLifespan() {
    const dateFormat = 'dd/MM/yyyy';
    if (!this.date_of_birth) return '';
    if (!this.date_of_death) return getParsedDate(this.date_of_birth, dateFormat);
    return `${getParsedDate(this.date_of_birth, dateFormat)} - ${getParsedDate(this.date_of_death, dateFormat)}`;
  });

// Virtual for author's date of birth
AuthorSchema
  .virtual('date_of_birth_formatted_edit')
  .get(function getDate() {
    if (!this.date_of_birth) return '';
    return getParsedDate(this.date_of_birth, 'yyyy-MM-dd');
  });

// Virtual for author's date of death
AuthorSchema
  .virtual('date_of_death_formatted_edit')
  .get(function getDate() {
    if (!this.date_of_death) return '';
    return getParsedDate(this.date_of_death, 'yyyy-MM-dd');
  });

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
