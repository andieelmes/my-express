const mongoose = require('mongoose');
const async = require('async');
const { body, validationResult } = require('express-validator');

const Genre = require('../models/genre');
const Book = require('../models/book');

// Display list of all Genre.
exports.genre_list = (req, res, next) => {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec((err, list) => {
      if (err) {
        next(err);
        return;
      }
      // Successful, so render
      res.render('genre_list', { title: 'Genre List', genre_list: list });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = (req, res, next) => {
  const id = mongoose.Types.ObjectId(req.params.id);

  async.parallel({
    genre(callback) {
      Genre.findById(id)
        .exec(callback);
    },
    genre_books(callback) {
      Book.find({ genre: id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }
    if (results.genre == null) { // No results.
      const notFound = new Error('Genre not found');
      notFound.status = 404;
      next(notFound);
      return;
    }
    // Successful, so render
    res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books });
  });
};

// Display Genre create form on GET.
exports.genre_create_get = (req, res) => {
  res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and santise the name field.
  body('name').trim().isLength({ min: 1 }).escape()
    .withMessage('Genre name is required'),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre(
      { name: req.body.name },
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', { title: 'Create Genre', genre, errors: errors.array() });
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name })
        .exec((err, found_genre) => {
          if (err) {
            next(err);
            return;
          }

          if (found_genre) {
            // Genre exists, redirect to its detail page.
            res.redirect(found_genre.url);
          } else {
            genre.save((saveErr) => {
              if (saveErr) {
                next(saveErr);
                return;
              }
              // Genre saved. Redirect to genre detail page.
              res.redirect(genre.url);
            });
          }
        });
    }
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = (req, res, next) => {
  const id = mongoose.Types.ObjectId(req.params.id);

  async.parallel({
    genre(callback) {
      Genre.findById(id)
        .exec(callback);
    },
    genre_books(callback) {
      Book.find({ genre: id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err || results.genre == null) {
      res.redirect('/catalog/genres');
      next(err);
      return;
    }
    // Successful, so render
    res.render('genre_delete', { title: 'Delte genre', genre: results.genre, genre_books: results.genre_books });
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = (req, res, next) => {
  const id = mongoose.Types.ObjectId(req.params.id);

  async.parallel({
    genre(callback) {
      Genre.findById(id)
        .exec(callback);
    },
    genre_books(callback) {
      Book.find({ genre: id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    if (results.book_instances && results.book_instances.length) {
      res.render('genre_delete', { title: 'Delte genre', genre: results.genre, genre_books: results.genre_books });
    } else {
      Genre.findByIdAndRemove(id, (deleteError) => {
        if (deleteError) {
          next(deleteError);
          return;
        }
        res.redirect('/catalog/genres');
      });
    }
  });
};

// Display Genre update form on GET.
exports.genre_update_get = (req, res, next) => {
  const id = mongoose.Types.ObjectId(req.params.id);

  Genre.findById(id)
    .exec((err, genre) => {
      if (err) {
        next(err);
        return;
      }
      if (genre == null) { // No results.
        const notFound = new Error('Genre not found');
        notFound.status = 404;
        next(notFound);
        return;
      }
      // Successful, so render
      res.render('genre_form', { title: 'Update form', genre });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and santise the name field.
  body('name').trim().isLength({ min: 1 }).escape()
    .withMessage('Genre name is required'),
  body('name').trim()
    .custom((value, { req }) => (
      Genre.findOne({ name: req.body.name, _id: { $ne: req.params.id } }).then((genre) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        if (genre) return Promise.reject('Genre with this name already exists');
        return false;
      })
    )),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre(
      {
        name: req.body.name,
        _id: req.params.id, // This is required, or a new ID will be assigned!
      },
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', { title: 'Update Genre', genre, errors: errors.array() });
      return;
    }

    Genre.findByIdAndUpdate(req.params.id, genre, {}, (err) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(genre.url);
    });
  },
];
