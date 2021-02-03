const mongoose = require('mongoose');
const format = require('date-fns/format');

const { Schema } = mongoose;

const BookInstanceSchema = new Schema(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, // reference to the associated book
    imprint: { type: String, required: true },
    status: {
      type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance',
    },
    due_back: { type: Date, default: Date.now },
  },
);

// Virtual for bookinstance's URL
BookInstanceSchema
  .virtual('url')
  .get(function getUrl() {
    return `/catalog/bookinstance/${this._id}`;
  });

BookInstanceSchema
  .virtual('due_back_formatted_view')
  .get(function getDate() {
    return this.due_back && format(Date.parse(this.due_back), 'do MMM y');
  });

BookInstanceSchema
  .virtual('due_back_formatted_edit')
  .get(function getDate() {
    return this.due_back && format(Date.parse(this.due_back), 'yyyy-MM-dd');
  });

// Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
