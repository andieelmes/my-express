const async = require('async');
const { body, validationResult } = require('express-validator');

const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

exports.index = (req, res) => {
  async.parallel({
    book_count(callback) {
      Book.countDocuments({}, callback);
      // Pass an empty object as match condition to find all documents of this collection
    },
    book_instance_count(callback) {
      BookInstance.countDocuments({}, callback);
    },
    book_instance_available_count(callback) {
      BookInstance.countDocuments({ status: 'Available' }, callback);
    },
    author_count(callback) {
      Author.countDocuments({}, callback);
    },
    genre_count(callback) {
      Genre.countDocuments({}, callback);
    },
  }, (err, results) => {
    res.render('index', { title: 'Local Library Home', error: err, data: results });
  });
};

// Display list of all books.
exports.book_list = (req, res, next) => {
  Book.find({}, 'title author')
    .populate('author')
    .exec((err, list_books) => {
      if (err) {
        next(err);
        return;
      }
      // Successful, so render
      res.render('book_list', { title: 'Book List', book_list: list_books });
    });
};

// Display detail page for a specific book.
exports.book_detail = (req, res, next) => {
  async.parallel({
    book(callback) {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    book_instance(callback) {
      BookInstance.find({ book: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }
    if (results.book == null) { // No results.
      const notFound = new Error('Book not found');
      notFound.status = 404;
      next(notFound);
      return;
    }
    // Successful, so render.
    res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance });
  });
};

// Display book create form on GET.
exports.book_create_get = (req, res, next) => {
  async.parallel({
    authors(callback) {
      Author.find(callback);
    },
    genres(callback) {
      Genre.find(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }
    res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
  });
};

// Handle book create on POST.
exports.book_create_post = [
  (req, res, next) => {
    if (!req.body.genre) {
      req.body.genre = [];
      next();
      return;
    }
    next();
  },
  body('title').trim().isLength({ min: 1 }).escape()
    .withMessage('Title is required'),
  body('author').trim().isLength({ min: 1 }).escape()
    .withMessage('Author is required'),
  body('summary').trim().isLength({ min: 1 }).escape()
    .withMessage('Summary is required'),
  body('isbn').trim().isLength({ min: 1 }).escape()
    .withMessage('ISBN is required'),
  body('genre.*').escape(),
  (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book(
      {
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre,
      },
    );

    if (!errors.isEmpty()) {
      async.parallel({
        authors(callback) {
          Author.find(callback);
        },
        genres(callback) {
          Genre.find(callback);
        },
      }, (err, results) => {
        if (err) {
          next(err);
          return;
        }

        const genres = results.genres.map((item) => (
          { ...item.toObject(), checked: book.genre.includes(item._id) }
        ));

        res.render('book_form', {
          title: 'Create Book', book, authors: results.authors, genres, errors: errors.array(),
        });
      });
    } else {
      book.save((err) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(book.url);
      });
    }
  },
];

// Display book delete form on GET.
exports.book_delete_get = (req, res, next) => {
  async.parallel({
    book(callback) {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    book_instance(callback) {
      BookInstance.find({ book: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err || results.book == null) {
      res.redirect('/catalog/authors');
      next(err);
      return;
    }
    // Successful, so render.
    res.render('book_delete', { title: results.book.title, book: results.book, book_instances: results.book_instance });
  });
};

// Handle book delete on POST.
exports.book_delete_post = (req, res, next) => {
  async.parallel({
    book(callback) {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    book_instance(callback) {
      BookInstance.find({ book: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    if (results.book_instances && results.book_instances.length) {
      res.render('book_delete', { title: results.book.title, book: results.book, book_instances: results.book_instance });
    } else {
      Book.findByIdAndRemove(req.body.book_id, (removeError) => {
        if (removeError) {
          next(removeError);
          return;
        }
        res.redirect('/catalog/books');
      });
    }
  });
};

// Display book update form on GET.
exports.book_update_get = (req, res, next) => {
  async.parallel({
    book(callback) {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    authors(callback) {
      Author.find(callback);
    },
    genres(callback) {
      Genre.find(callback);
    },
  }, (err, results) => {
    if (err) {
      next(err);
      return;
    }

    if (results.book === null) { // No results.
      const notFound = new Error('Book not found');
      notFound.status = 404;
      next(notFound);
      return;
    }

    const genres = results.genres.map((item) => (
      {
        ...item.toObject(),
        checked: results.book.genre.find(
          (genre) => String(genre._id) === String(item._id),
        ),
      }
    ));

    res.render('book_form', {
      title: 'Update Book', book: results.book, authors: results.authors, genres,
    });
  });
};

// Handle book update on POST.
exports.book_update_post = [
  (req, res, next) => {
    if (!req.body.genre) {
      req.body.genre = [];
      next();
      return;
    }
    next();
  },
  body('title').trim().isLength({ min: 1 }).escape()
    .withMessage('Title is required'),
  body('author').trim().isLength({ min: 1 }).escape()
    .withMessage('Author is required'),
  body('summary').trim().isLength({ min: 1 }).escape()
    .withMessage('Summary is required'),
  body('isbn').trim().isLength({ min: 1 }).escape()
    .withMessage('ISBN is required'),
  body('genre.*').escape(),
  (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book(
      {
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre,
        _id: req.params.id, // This is required, or a new ID will be assigned!
      },
    );

    if (!errors.isEmpty()) {
      async.parallel({
        authors(callback) {
          Author.find(callback);
        },
        genres(callback) {
          Genre.find(callback);
        },
      }, (err, results) => {
        if (err) {
          next(err);
          return;
        }

        const genres = results.genres.map((item) => (
          { ...item.toObject(), checked: book.genre.includes(item._id) }
        ));

        res.render('book_form', {
          title: 'Update Book', book, authors: results.authors, genres, errors: errors.array(),
        });
      });
    } else {
      Book.findByIdAndUpdate(req.params.id, book, {}, (err) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(book.url);
      });
    }
  },
];
