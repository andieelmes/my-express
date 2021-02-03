const async = require('async');
const { body, validationResult } = require('express-validator');

const Author = require('../models/author');
const Book = require('../models/book');

// Display list of all Authors.
exports.author_list = (req, res, next) => {
  Author.find()
    .sort([['family_name', 'ascending']])
    .exec((err, list_authors) => {
      if (err) {
        next(err);
        return;
      }
      // Successful, so render
      res.render('author_list', { title: 'Author List', author_list: list_authors });
    });
};

// Display detail page for a specific Author.
exports.author_detail = (req, res, next) => {
  async.parallel({
    author(callback) {
      Author.findById(req.params.id)
        .exec(callback);
    },
    books(callback) {
      Book.find({ author: req.params.id }, 'title summary')
        .populate('author')
        .exec(callback);
    },
  }, (err, results) => {
    if (err || results.author == null) {
      res.redirect('/catalog/authors');
      next(err);
      return;
    }
    // Successful, so render.
    res.render('author_detail', { title: results.author.name, author: results.author, books: results.books });
  });
};

// Display Author create form on GET.
exports.author_create_get = (req, res) => {
  res.render('author_form', { title: 'Create Author' });
};

// Handle Author create on POST.
exports.author_create_post = [
  body('first_name')
    .trim().isLength({ min: 1 }).escape()
    .withMessage('First name is required')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name')
    .trim().isLength({ min: 1 }).escape()
    .withMessage('Family name is required')
    .isAlphanumeric()
    .withMessage('Familiy name has non-alphanumeric characters.'),
  body('date_of_birth').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid date of birth'),
  body('date_of_death').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid date of death'),
  (req, res, next) => {
    const author = new Author(
      {
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
      },
    );

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render('author_form', { title: 'Create Author', author, errors: errors.array() });
    } else {
      author.save((err) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(author.url);
      });
    }
  },
];

// Display Author delete form on GET.
exports.author_delete_get = (req, res, next) => {
  async.parallel({
    author(callback) {
      Author.findById(req.params.id)
        .exec(callback);
    },
    books(callback) {
      Book.find({ author: req.params.id }, 'title summary')
        .exec(callback);
    },
  }, (err, results) => {
    if (err || results.author == null) {
      res.redirect('/catalog/authors');
      next(err);
      return;
    }
    // Successful, so render.
    res.render('author_delete', { title: results.author.name, books: results.books, author: results.author });
  });
};

// Handle Author delete on POST.
exports.author_delete_post = (req, res, next) => {
  async.parallel({
    author(callback) {
      Author.findById(req.params.id)
        .exec(callback);
    },
    books(callback) {
      Book.find({ author: req.params.id }, 'title summary')
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    if (results.books && results.books.length) {
      res.render('author_delete', { title: results.author.name, books: results.books, author: results.author });
    } else {
      Author.findByIdAndRemove(req.body.author_id, (removeError) => {
        if (removeError) {
          next(removeError);
          return;
        }
        res.redirect('/catalog/authors');
      });
    }
  });
};

// Display Author update form on GET.
exports.author_update_get = (req, res, next) => {
  Author.findById(req.params.id)
    .exec((err, author) => {
      if (err || author == null) {
        res.redirect('/catalog/authors');
        next(err);
        return;
      }

      res.render('author_form', { title: 'Update Author', author });
    });
};

// Handle Author update on POST.
exports.author_update_post = [
  body('first_name')
    .trim().isLength({ min: 1 }).escape()
    .withMessage('First name is required')
    .isAlphanumeric()
    .withMessage('First name has non-alphanumeric characters.'),
  body('family_name')
    .trim().isLength({ min: 1 }).escape()
    .withMessage('Family name is required')
    .isAlphanumeric()
    .withMessage('Familiy name has non-alphanumeric characters.'),
  body('date_of_birth').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid date of birth'),
  body('date_of_death').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid date of death'),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render('author_form', { title: 'Update Author', author: req.body, errors: errors.array() });
    } else {
      const author = new Author(
        {
          first_name: req.body.first_name,
          family_name: req.body.family_name,
          date_of_birth: req.body.date_of_birth,
          date_of_death: req.body.date_of_death,
          _id: req.params.id, // This is required, or a new ID will be assigned!
        },
      );

      Author.findByIdAndUpdate(req.params.id, author, {}, (err) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(author.url);
      });
    }
  },
];
