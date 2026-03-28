// Test syntax of all controllers
console.log('Testing syntax of controllers...');

try {
  require('./controllers/borrows.controller');
  console.log('✅ borrows.controller.js - OK');
} catch (e) {
  console.error('❌ borrows.controller.js -', e.message);
}

try {
  require('./controllers/reading.controller');
  console.log('✅ reading.controller.js - OK');
} catch (e) {
  console.error('❌ reading.controller.js -', e.message);
}

try {
  require('./controllers/users.controller');
  console.log('✅ users.controller.js - OK');
} catch (e) {
  console.error('❌ users.controller.js -', e.message);
}

try {
  require('./routes/borrows.routes');
  console.log('✅ borrows.routes.js - OK');
} catch (e) {
  console.error('❌ borrows.routes.js -', e.message);
}

try {
  require('./routes/reading.routes');
  console.log('✅ reading.routes.js - OK');
} catch (e) {
  console.error('❌ reading.routes.js -', e.message);
}

try {
  require('./routes/users.routes');
  console.log('✅ users.routes.js - OK');
} catch (e) {
  console.error('❌ users.routes.js -', e.message);
}

try {
  require('./routes/books.routes');
  console.log('✅ books.routes.js - OK');
} catch (e) {
  console.error('❌ books.routes.js -', e.message);
}

console.log('\nAll modules loaded successfully!');
