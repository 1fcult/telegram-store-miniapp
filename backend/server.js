require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV_MODE = process.env.DEV_MODE === 'true';

// Убедимся, что папка uploads существует
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Настройка Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage: storage })

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// TELEGRAM AUTH
// ==========================================

// Валидация initData от Telegram
function validateInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  // Собираем строку для проверки
  params.delete('hash');
  const dataCheckArr = [];
  params.sort();
  params.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  const dataCheckString = dataCheckArr.join('\n');

  // HMAC-SHA256 проверка
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash !== hash) {
    console.warn('[AUTH] Invalid initData hash');
    return null;
  }

  // Извлекаем данные пользователя
  const userParam = params.get('user');
  if (!userParam) return null;

  try {
    return JSON.parse(userParam);
  } catch {
    return null;
  }
}

// Роут: Авторизация через Telegram
app.post('/api/auth', async (req, res) => {
  const { initData } = req.body;

  // DEV_MODE — позволяет войти без Telegram
  if (DEV_MODE && !initData) {
    console.log('[AUTH] DEV_MODE: Creating dev user');
    const devUser = await prisma.user.upsert({
      where: { telegramId: 'dev_admin' },
      update: { name: 'Dev Admin', username: 'dev_admin' },
      create: {
        telegramId: 'dev_admin',
        name: 'Dev Admin',
        username: 'dev_admin',
        role: 'ADMIN'
      }
    });
    return res.json({ user: devUser });
  }

  // Проверяем initData
  const telegramUser = validateInitData(initData);
  if (!telegramUser) {
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  console.log(`[AUTH] Authenticated Telegram user: ${telegramUser.id} (@${telegramUser.username})`);

  // Создаём или обновляем пользователя
  const isPresident = telegramUser.username === 'asg_1f';
  const fullName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
  const photoUrl = telegramUser.photo_url || null;

  const user = await prisma.user.upsert({
    where: { telegramId: String(telegramUser.id) },
    update: {
      name: fullName,
      username: telegramUser.username || null,
      photoUrl,
      ...(isPresident && { role: 'PRESIDENT' })
    },
    create: {
      telegramId: String(telegramUser.id),
      name: fullName,
      username: telegramUser.username || null,
      photoUrl,
      role: isPresident ? 'PRESIDENT' : 'CLIENT'
    },
    include: { adminShops: { include: { shop: { select: { id: true, name: true } } } } }
  });

  res.json({ user });
});

// Middleware: Проверка авторизации (Universal)
async function requireAuth(req, res, next) {
  // DEV_MODE — создаём/находим реального пользователя
  // if (DEV_MODE) {
  //   let user = await prisma.user.findUnique({ where: { telegramId: 'dev_admin' } });
  //   if (!user) {
  //     user = await prisma.user.create({ data: { telegramId: 'dev_admin', name: 'Dev Admin', role: 'ADMIN' } });
  //   }
  //   req.user = user;
  //   return next();
  // }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('tma ')) {
    // Fallback to old x-telegram-id for backward compatibility during transition
    const telegramId = req.headers['x-telegram-id'];
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
    }
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    req.user = user;
    return next();
  }

  const initData = authHeader.substring(4);
  const telegramUser = validateInitData(initData);

  if (!telegramUser) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Telegram data signature' });
  }

  const user = await prisma.user.findUnique({
    where: { telegramId: String(telegramUser.id) },
    include: { adminShops: { include: { shop: { select: { id: true, name: true } } } } }
  });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found in database' });
  }

  // Attach convenience array of shopIds for ADMIN checks
  req.user = {
    ...user,
    adminShopIds: user.adminShops.map(as => as.shopId)
  };
  next();
}

// Middleware: только PRESIDENT
function requirePresident(req, res, next) {
  if (DEV_MODE) return next();
  if (!req.user || req.user.role !== 'PRESIDENT') {
    return res.status(403).json({ error: 'Access denied: Requires PRESIDENT role' });
  }
  next();
}

// Middleware: ADMIN или PRESIDENT
function requireAdmin(req, res, next) {
  if (DEV_MODE) return next();
  if (!req.user || !['ADMIN', 'PRESIDENT'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Requires ADMIN role' });
  }
  next();
}

// Middleware: COURIER, ADMIN или PRESIDENT
function requireCourier(req, res, next) {
  if (DEV_MODE) return next();
  if (!req.user || !['COURIER', 'ADMIN', 'PRESIDENT'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Requires COURIER role' });
  }
  next();
}

// ==========================================
// API ROUTES
// ==========================================

// Контроллер здоровья
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', devMode: DEV_MODE });
});

// Роут: Получение текущего пользователя (для фронтенда)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// USERS
// ==========================================

// Роут: Получение пользователей
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    // PRESIDENT видит всех, ADMIN видит только курьеров
    const where = req.user.role === 'PRESIDENT' ? {} : { role: 'COURIER' };
    const users = await prisma.user.findMany({
      where,
      include: { adminShops: { include: { shop: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Роут: Обновление роли пользователя
app.put('/api/users/:id/role', requireAuth, async (req, res) => {
  try {
    const actorRole = req.user.role;
    const { id } = req.params;
    const { role: newRole, shopIds } = req.body; // shopIds: number[] for ADMIN

    const allowedByPresident = ['CLIENT', 'ADMIN', 'COURIER'];
    const allowedByAdmin = ['COURIER', 'CLIENT'];

    if (actorRole === 'PRESIDENT') {
      if (!allowedByPresident.includes(newRole)) {
        return res.status(400).json({ error: 'Недопустимая роль' });
      }
    } else if (actorRole === 'ADMIN') {
      if (!allowedByAdmin.includes(newRole)) {
        return res.status(403).json({ error: 'ADMIN может назначать только COURIER или CLIENT' });
      }
    } else {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const targetId = parseInt(id);

    // Сначала обновляем роль
    await prisma.user.update({ where: { id: targetId }, data: { role: newRole } });

    // Для ADMIN: удаляем старые связи и создаём новые
    if (newRole === 'ADMIN' && actorRole === 'PRESIDENT' && Array.isArray(shopIds)) {
      await prisma.adminShop.deleteMany({ where: { userId: targetId } });
      if (shopIds.length > 0) {
        await prisma.adminShop.createMany({
          data: shopIds.map(sId => ({ userId: targetId, shopId: parseInt(sId) }))
        });
      }
    } else if (newRole !== 'ADMIN') {
      // Если роль не ADMIN — удаляем все связи c магазинами
      await prisma.adminShop.deleteMany({ where: { userId: targetId } });
    }

    const updated = await prisma.user.findUnique({
      where: { id: targetId },
      include: { adminShops: { include: { shop: { select: { id: true, name: true } } } } }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка обновления роли' });
  }
});

// Роут: Загрузка изображения (только для админов)
app.post('/api/upload', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const host = req.headers.host || '178-72-165-215.nip.io';
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});
// ==========================================
// SHOPS
// ==========================================

// Роут: Получение магазинов
app.get('/api/shops', async (req, res) => {
  try {
    const shops = await prisma.shop.findMany();
    res.json(shops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения магазинов' });
  }
});

// Роут: Создание магазина (только для админов)
app.post('/api/shops', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newShop = await prisma.shop.create({
      data: { name, description: description || null, imageUrl: imageUrl || null, status: status || 'ACTIVE' }
    });
    res.status(201).json(newShop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании магазина' });
  }
});

// Роут: Обновление магазина
app.put('/api/shops/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, status } = req.body;
    const updated = await prisma.shop.update({
      where: { id: parseInt(id) },
      data: { name, description, imageUrl, status }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при обновлении магазина' });
  }
});

// Роут: Удаление магазина
app.delete('/api/shops/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await prisma.product.count({ where: { shopId: parseInt(id) } });
    const catsCount = await prisma.category.count({ where: { shopId: parseInt(id) } });
    if (productsCount > 0 || catsCount > 0) {
      return res.status(400).json({ error: `Нельзя удалить: в магазине ${productsCount} товар(ов) и ${catsCount} категорий` });
    }
    await prisma.shop.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении магазина', details: error.message });
  }
});

// ==========================================
// CATEGORIES
// ==========================================

// Роут: Получение категорий (доступен всем)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

// Роут: Создание категории (только для админов)
app.post('/api/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, shopId, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // ADMIN может создавать категории только в своих направлениях
    const parsedShopId = shopId ? parseInt(shopId) : null;
    let effectiveShopId = parsedShopId;

    if (req.user.role === 'ADMIN') {
      const adminShopIds = req.user.adminShopIds || [];
      if (adminShopIds.length === 0) {
        return res.status(403).json({ error: 'Вам не назначено ни одного направления' });
      }
      // Если shopId указан и есть в списке, используем его; иначе — первый доступный
      if (parsedShopId && adminShopIds.includes(parsedShopId)) {
        effectiveShopId = parsedShopId;
      } else {
        effectiveShopId = adminShopIds[0];
      }
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        shopId: effectiveShopId,
        parentId: parentId ? parseInt(parentId) : null
      }
    });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании категории' });
  }
});

// Роут: Получение всех товаров (доступен всем)
// ?all=true — показать все (для админки), иначе только stock > 0
app.get('/api/products', async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const products = await prisma.product.findMany({
      where: showAll ? {} : { stock: { gt: 0 } },
      include: { category: true }
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// Роут: Добавление товара (только для админов)
app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
  console.log(`[▶️ POST /api/products] Incoming payload:`, req.body);
  try {
    const { title, description, price, stock, imageUrls, categoryId, shopId } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    // ADMIN может добавлять товары только в свои Shop
    const parsedShopId = shopId ? parseInt(shopId) : null;
    let effectiveShopId = parsedShopId;

    if (req.user.role === 'ADMIN') {
      const adminShopIds = req.user.adminShopIds || [];
      if (adminShopIds.length === 0) {
        return res.status(403).json({ error: 'Вам не назначено ни одного направления' });
      }
      effectiveShopId = (parsedShopId && adminShopIds.includes(parsedShopId))
        ? parsedShopId : adminShopIds[0];
    }

    const newProduct = await prisma.product.create({
      data: {
        title,
        description: description || '',
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        imageUrls: imageUrls || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        shopId: effectiveShopId
      },
      include: { category: true }
    });

    console.log(`[✅ POST /api/products] Database Save SUCCESS:`, newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(`[❌ POST /api/products] Database Save ERROR:`, error);
    res.status(500).json({ error: 'Ошибка при создании товара', details: error.message });
  }
});

// Роут: Обновление товара (только для админов)
app.put('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, stock, imageUrls, categoryId, shopId } = req.body;
    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description: description || '',
        price: parseFloat(price),
        stock: stock !== undefined ? parseInt(stock) : undefined,
        imageUrls: imageUrls || null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        shopId: shopId ? parseInt(shopId) : null
      },
      include: { category: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Ошибка при обновлении товара', details: error.message });
  }
});

// Роут: Удаление товара (только для админов)
app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Ошибка при удалении товара', details: error.message });
  }
});

// Роут: Обновление категории (только для админов)
app.put('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shopId, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Find existing to fallback values if not provided explicitly
    const existing = await prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name,
        shopId: shopId !== undefined ? (shopId ? parseInt(shopId) : null) : existing.shopId,
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : existing.parentId
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Ошибка при обновлении категории', details: error.message });
  }
});

// Роут: Удаление категории (только для админов)
app.delete('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await prisma.product.count({ where: { categoryId: parseInt(id) } });
    if (count > 0) {
      return res.status(400).json({ error: `Нельзя удалить: в категории ${count} товар(ов)` });
    }
    const childrenCount = await prisma.category.count({ where: { parentId: parseInt(id) } });
    if (childrenCount > 0) {
      return res.status(400).json({ error: `Нельзя удалить: в категории ${childrenCount} подкатегорий` });
    }
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Ошибка при удалении категории', details: error.message });
  }
});

// ==========================================
// ORDER ROUTES
// ==========================================

// Роут: Создание заказа (авторизованные пользователи)
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { items, paymentMethod, deliveryMethod, address } = req.body;

    if (!items || !items.length || !paymentMethod || !deliveryMethod) {
      return res.status(400).json({ error: 'Необходимы: items, paymentMethod, deliveryMethod' });
    }

    // Проверяем stock и считаем total
    let total = 0;
    const productChecks = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(400).json({ error: `Товар #${item.productId} не найден` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Недостаточно "${product.title}" — осталось ${product.stock} шт.` });
      }
      total += product.price * item.quantity;
      productChecks.push({ product, quantity: item.quantity });
    }

    // Транзакция: создаем заказ + списываем stock
    const order = await prisma.$transaction(async (tx) => {
      // Списываем stock
      for (const { product, quantity } of productChecks) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: quantity } }
        });
      }

      // Создаем заказ
      return tx.order.create({
        data: {
          userId: req.user.id,
          paymentMethod,
          deliveryMethod,
          address: address || null,
          total,
          items: {
            create: productChecks.map(({ product, quantity }) => ({
              productId: product.id,
              quantity,
              price: product.price
            }))
          }
        },
        include: {
          items: { include: { product: true } }
        }
      });
    });

    console.log(`[✅ ORDER #${order.id}] ${deliveryMethod} / ${paymentMethod} / ${total}₽`);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Ошибка при создании заказа', details: error.message });
  }
});

// Роут: Получение заказов пользователя
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Роут: Получение всех заказов (только для админов)
app.get('/api/orders/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        courier: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Ошибка получения всех заказов' });
  }
});

// Роут: Обновление статуса/курьера заказа (только для админов)
app.put('/api/orders/:id/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, courierId } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (courierId !== undefined) updateData.courierId = courierId ? parseInt(courierId) : null;

    const updated = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: true,
        courier: true,
        items: { include: { product: true } }
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating order by admin:', error);
    res.status(500).json({ error: 'Ошибка при обновлении заказа', details: error.message });
  }
});

// ==========================================
// COURIER ROUTES
// ==========================================

// Роут: Получение всех заказов готовых к доставке (для курьеров)
app.get('/api/courier/orders', requireAuth, requireCourier, async (req, res) => {
  try {
    const whereClause = {
      status: { in: ['PENDING', 'CONFIRMED', 'DELIVERING'] }
    };

    // В продакшене отдаем заказы только этого курьера. В DEV_MODE отдаем все для тестов.
    if (!DEV_MODE) {
      whereClause.courierId = req.user.id;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: true,
        items: { include: { product: { include: { shop: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching courier orders:', error);
    res.status(500).json({ error: 'Ошибка получения заказов для курьера' });
  }
});

// Роут: Изменение статуса заказа (для курьеров)
app.put('/api/courier/orders/:id/status', requireAuth, requireCourier, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['CONFIRMED', 'DELIVERING', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус заказа' });
    }
    const updateData = { status };
    if (status === 'CONFIRMED' || status === 'DELIVERING') {
      updateData.courierId = req.user.id;
    }

    const updated = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Ошибка изменения статуса заказа' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} | DEV_MODE: ${DEV_MODE}`);
});
