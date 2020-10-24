const express = require("express");
const router = express();
const Book = require("../models").Book;
const paginate = require("express-paginate");
const { Op } = require("sequelize");

// Middleware for adding oaginaition and the limits
router.use(paginate.middleware(10, 50));

// Async handler function for wrapping routes
function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (error) {
      res.status(500).send(error);
    }
  };
}

// Redirects '/' route to '/books'
router.get("/", (req, res) => {
  res.redirect("/books");
});

//  Shows full list of books
router.get(
  "/books",
  asyncHandler(async (req, res) => {
    let search = {};

    // Creates the query for book data search and retrieval
    if (req.query.search) {
      search = {
        where: {
          [Op.or]: {
            title: { [Op.like]: `%${req.query.search}%` },
            author: { [Op.like]: `%${req.query.search}%` },
            genre: { [Op.like]: `%${req.query.search}%` },
            year: { [Op.like]: `%${req.query.search}%` },
          },
        },
      };
    }

    // Gets all books matching the search
    const books = await Book.findAll(search);

    // Provides the data for pagination
    await Book.findAndCountAll({
      search,
      limit: req.query.limit,
      offset: req.skip,
    })
      .then((results) => {
        const itemCount = results.count;
        const pageCount = Math.ceil(results.count / req.query.limit);
        const offset = req.skip;
        const limit = req.query.page * req.query.limit;
        res.render("books/index", {
          books,
          title: "Books",
          pageCount,
          itemCount,
          offset,
          limit,
          pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
        });
      })
      .catch((err) => next(err));
  })
);

// Posts the search query to /books
router.post(
  "/books",
  asyncHandler(async (req, res) => {
    res.redirect(`/books/?search=${req.body.search}`);
  })
);

// Shows the create new book form
router.get(
  "/books/new",
  asyncHandler(async (req, res) => {
    res.render("books/new_book", { book: {}, title: "New Book" });
  })
);

// Posts the new book to the database
router.post(
  "/books/new",
  asyncHandler(async (req, res) => {
    let book;
    try {
      book = await Book.create(req.body);
      res.redirect("/books");
    } catch (error) {
      // Checks to see if the error is a Sequelize Validation Error
      if (error.name === "SequelizeValidationError") {
        book = await Book.build(req.body);
        res.render("books/new_book", {
          book,
          errors: error.errors,
          title: "New Book",
        });
      } else {
        // Throws error to be caught in asyncHandler catch block
        throw error;
      }
    }
  })
);

// Shows the book details form
router.get(
  "/books/:id",
  asyncHandler(async (req, res, next) => {
    const book = await Book.findByPk(req.params.id);
    if (book) {
      res.render("books/update_book", { book, title: "Update Book" });
    } else {
      const error = new Error("500 error");
      error.status = 500;
      next(error);
    }
  })
);

// Updates book info in the database
router.post(
  "/books/:id",
  asyncHandler(async (req, res) => {
    let book;
    try {
      book = await Book.findByPk(req.params.id);
      if (book) {
        await book.update(req.body);
        res.redirect("/books");
      } else {
        res.sendStatus(404);
      }
    } catch (error) {
      // Checks to see if the error is a Sequelize Validation Error
      if (error.name === "SequelizeValidationError") {
        book = await Book.build(req.body);
        book.id = req.params.id;
        res.render("books/update-book", {
          book,
          errors: error.errors,
          title: "Update Book",
        });
      } else {
        // Throws error to be caught in asyncHandler catch block
        throw error;
      }
    }
  })
);

// Deletes a book
router.post(
  "/books/:id/delete",
  asyncHandler(async (req, res) => {
    const book = await Book.findByPk(req.params.id);
    await book.destroy();
    res.redirect("/books");
  })
);

module.exports = router;
