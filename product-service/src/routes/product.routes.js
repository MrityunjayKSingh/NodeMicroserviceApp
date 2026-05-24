const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth.middleware');
const upload     = require('../middleware/upload.middleware');
const ProductController = require('../controllers/product.controller');

router.get('/',       auth,                          ProductController.getAll);
router.get('/mine',   auth,                          ProductController.getMyProducts);
router.get('/:id',    auth,                          ProductController.getById);
router.post('/',      auth, upload.single('image'),  ProductController.create);
router.put('/:id',    auth, upload.single('image'),  ProductController.update);
router.delete('/:id', auth,                          ProductController.remove);

module.exports = router;
