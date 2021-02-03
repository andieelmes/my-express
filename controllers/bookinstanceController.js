const async = require('async');
const { body, validationResult } = require('express-validator');

const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');

// Display list of all BookInstances.
exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
    .populate('book')
    .exec((err, list_bookinstances) => {
      if (err) {
        next(err);
        return;
      }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, instance) => {
      if (err) {
        next(err);
        return;
      }
      if (instance == null) { // No results.
        const notFound = new Error('Book not found');
        notFound.status = 404;
        next(notFound);
        return;
      }
      // Successful, so render.
      res.render('bookinstance_detail', { title: instance._id, instance, book: instance.book });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = (req, res, next) => {
  async.parallel({
    books(callback) {
      Book.find({}, 'title author').populate('author').exec(callback);
    },
    statuses(callback) {
      callback(null, BookInstance.schema.path('status').enumValues);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    res.render('bookinstance_form', { title: 'Create BookInstance', books: results.books, statuses: results.statuses });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  (req, res, next) => {
    res.locals.statuses = BookInstance.schema.path('status').enumValues;
    next();
  },
  body('book').trim().isLength({ min: 1 }).escape()
    .withMessage('Book is required'),
  body('imprint').trim().isLength({ min: 1 }).escape()
    .withMessage('Imprint is required'),
  body('due_date').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid due date'),
  body('status').trim().isLength({ min: 1 }).escape()
    .withMessage((value, { res }) => `Status is not valid, valid statuses: ${res.locals.statuses.join(', ')}`),
  (req, res, next) => {
    const errors = validationResult(req);

    const instance = new BookInstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
      },
    );

    if (!errors.isEmpty()) {
      async.parallel({
        books(callback) {
          Book.find({}, 'title author').populate('author').exec(callback);
        },
        statuses(callback) {
          callback(null, BookInstance.schema.path('status').enumValues);
        },
      }, (err, results) => {
        if (err) {
          next(err);
          return;
        }

        res.render('bookinstance_form', {
          title: 'Create BookInstance', instance, books: results.books, statuses: results.statuses, errors: errors.array(),
        });
      });
    } else {
      instance.save((err) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(instance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, instance) => {
      if (err || instance == null) {
        res.redirect('/catalog/bookinstances');
        next(err);
        return;
      }
      // Successful, so render.
      res.render('bookinstance_delete', { title: instance._id, instance, book: instance.book });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .exec((err) => {
      if (err) {
        next(err);
        return;
      }

      BookInstance.findByIdAndRemove(req.body.instance_id, (removeError) => {
        if (removeError) {
          next(removeError);
          return;
        }
        res.redirect('/catalog/bookinstances');
      });
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = (req, res, next) => {
  async.parallel({
    instance(callback) {
      BookInstance.findById(req.params.id).populate('book').exec(callback);
    },
    books(callback) {
      Book.find({}, 'title author').populate('author').exec(callback);
    },
    statuses(callback) {
      callback(null, BookInstance.schema.path('status').enumValues);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    res.render('bookinstance_form', {
      title: 'Update instance', instance: results.instance, books: results.books, statuses: results.statuses,
    });
  });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  (req, res, next) => {
    res.locals.statuses = BookInstance.schema.path('status').enumValues;
    next();
  },
  body('book').trim().isLength({ min: 1 }).escape()
    .withMessage('Book is required'),
  body('imprint').trim().isLength({ min: 1 }).escape()
    .withMessage('Imprint is required'),
  body('due_date').optional({ checkFalsy: true }).isISO8601().toDate()
    .withMessage('Invalid due date'),
  body('status').trim().isLength({ min: 1 }).escape()
    .withMessage((value, { res }) => `Status is not valid, valid statuses: ${res.locals.statuses.join(', ')}`),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const instance = new BookInstance(
        {
          book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back,
        },
      );

      async.parallel({
        books(callback) {
          Book.find({}, 'title author').populate('author').exec(callback);
        },
        statuses(callback) {
          callback(null, BookInstance.schema.path('status').enumValues);
        },
      }, (err, results) => {
        if (err) {
          next(err);
          return;
        }

        res.render('bookinstance_form', {
          title: 'Update BookInstance', instance, books: results.books, statuses: results.statuses, errors: errors.array(),
        });
      });

      return;
    }

    const instance = new BookInstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id, // This is required, or a new ID will be assigned!
      },
    );

    BookInstance.findByIdAndUpdate(req.params.id, instance, {}, (err) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(instance.url);
    });
  },
];
