const express = require('express')
const { isWebUri } = require('valid-url')
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')
const xss = require('xss')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
})



bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send(`'${field}' is required`)
      }
    }
    const { title, url, description, rating } = req.body


    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return res.status(400).send(`'rating' must be a number between 0 and 5`)
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`)
      return res.status(400).send(`'url' must be a valid URL`)
    }

    const newBookmark = { title, url, description, rating }

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(console.log('Something'))

    logger.info(`Bookmark with id ${newBookmark.id} created`)
    res
      .status(201)
      .location(`http://localhost:8000/api/bookmarks/${newBookmark.id}`)
      .json(newBookmark)

  })

bookmarksRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.json({
          id: bookmark.id,
          title: xss(bookmark.title),
          url: bookmark.url,
          description: xss(bookmark.description),
          rating: bookmark.rating,
        })
      })
      .catch(next)
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params

    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
      })


    BookmarksService.deleteBookmark(req.app.get('db'), bookmark_id)
      .then(() => {
        logger.info(`Bookmark with id ${bookmark_id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(bodyParser,(req, res, next) => {
    const { bookmark_id } = req.params

    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
      })
      for (const field of ['title', 'url', 'rating']) {
        if (!req.body[field]) {
          logger.error(`${field} is required`)
          return res.status(400).send(`'${field}' is required`)
        }
      }
      const { title, content, style } = req.body
      const articleToUpdate = { title, content, style }

      BookmarksService.updateBookmark(req.app.get('db'),bookmark_id,articleToUpdate)
      .then(res.status(204).end())
      .catch(next);




  })

module.exports = bookmarksRouter