import  fs from 'fs';
import { Command } from "commander";

const program = new Command(); // Об'єкт нашої програми

// Опис програми
program
    .name('disk_catalog')
    .description('Праграма для перегляду каталогу на диску')
    .version('0.0.1')

// Глобальна опція для вказання шляху до файлу
program
    .option('-f, --file <path>','C:\\Users\\omele\\OneDrive - lnu.edu.ua\\web  програмування на стороні сервера\\lab3\\data.json' ,'data.json')

// Функція для безпечного читання файлу
function loadData(filePath) {
    try{
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    }catch(e){
        console.error(e);
        process.exit(1);
    }
}
// Перелік елементів
program
    .command('list')
    .description('Показати стислий перелік елементів у каталозі')
    .option('-l, --limit <number>', 'обмежити кількість виведених елементів')
    .action((options) => {
        const data = loadData(program.opts().file);
        let items = data.contents || [];

        if (options.limit) {
            items = items.slice(0, parseInt(options.limit, 10));
        }

        console.log(`📁 Каталог: ${data.directoryName} (Всього елементів: ${data.totalElements})`);
        items.forEach(item => {
            console.log(`- [${item.type.toUpperCase()}] ${item.name}`);
        });
    });

// Один елемент повністю
program
    .command('info <name>')
    .description('Показати всі дані про конкретний файл чи папку')
    .action((name) => {
        const data = loadData(program.opts().file);
        const item = data.contents.find(el => el.name.toLowerCase() === name.toLowerCase());

        if (!item) {
            console.error(`❌ Помилка: Елемент з назвою "${name}" не знайдено.`);
            process.exit(1);
        }
        console.log(item);
    });

// Значення окремого поля
program
    .command('field <name> <fieldName>')
    .description('Показати значення конкретного поля елемента (наприклад, size або isHidden)')
    .action((name, fieldName) => {
        const data = loadData(program.opts().file);
        const item = data.contents.find(el => el.name === name);

        if (!item) {
            console.error(`❌ Помилка: Елемент "${name}" не знайдено.`);
            process.exit(1);
        }
        if (!(fieldName in item)) {
            console.error(`❌ Помилка: Поле "${fieldName}" відсутнє у елемента "${name}".`);
            process.exit(1);
        }

        console.log(`${fieldName}: ${item[fieldName]}`);
    });

// Вміст вкладеної папки (з прапорцем для прихованих)
program
    .command('folder-content <folderName>')
    .description('Показати вміст вкладеної папки')
    .option('-s, --show-hidden', 'показати також приховані елементи')
    .action((folderName, options) => {
        const data = loadData(program.opts().file);

        const folder = data.contents.find(el => el.name === folderName && el.type === 'folder');
        if (!folder) {
            console.error(`Помилка: Папку "${folderName}" не знайдено.`);
            process.exit(1);
        }

        // Якщо в папці немає масиву contents, використовуємо порожній масив []
        let items = folder.contents || [];

        // Якщо прапорець не передано, відфільтровуємо ті, де isHidden === true
        if (!options.showHidden) {
            items = items.filter(item => item.isHidden !== true);
        }

        console.log(`Вміст папки "${folderName}":`);
        if (items.length === 0) {
            console.log(' (Папка порожня або приховані елементи відфільтровано)');
        } else {
            items.forEach(item => console.log(`- ${item.name} (${item.type})`));
        }
    });
// Сумарний розмір папки (Рекурсія)
program
    .command('size <folderName>')
    .description('Показати сумарний розмір папки з урахуванням вкладених файлів')
    .action((folderName) => {
        const data = loadData(program.opts().file);

        const folder = data.contents.find(el => el.name === folderName && el.type === 'folder');
        if (!folder) {
            console.error(`Помилка: Папку "${folderName}" не знайдено.`);
            process.exit(1);
        }

        // Рекурсивна функція для підрахунку
        function calculateTotalSize(folderObj) {
            let total = 0;
            const items = folderObj.contents || [];

            for (const item of items) {
                if (item.type === 'file') {
                    total += item.size || 0; // Додаємо розмір файлу
                } else if (item.type === 'folder') {
                    total += calculateTotalSize(item); // Папка викликає цю ж функцію для себе
                }
            }
            return total;
        }

        const totalSize = calculateTotalSize(folder);
        console.log(`Загальний розмір папки "${folderName}": ${totalSize} байт.`);
    });

// Пошук файлу/папки за назвою в усьому дереві (Рекурсія)
program
    .command('search <searchName>')
    .description('Знайти файл чи папку за назвою в усьому каталозі')
    .action((searchName) => {
        const data = loadData(program.opts().file);
        let foundItems = [];

        // Рекурсивна функція пошуку
        function searchTree(items, currentPath) {
            for (const item of items) {
                const fullPath = `${currentPath}${item.name}`;

                // Порівнюємо назви, ігноруючи регістр букв
                if (item.name.toLowerCase().includes(searchName.toLowerCase())) {
                    foundItems.push({ path: fullPath, type: item.type });
                }

                // Якщо це папка і в ній є щось, шукаємо і там
                if (item.type === 'folder' && item.contents) {
                    searchTree(item.contents, `${fullPath}\\`);
                }
            }
        }

        searchTree(data.contents, data.directoryName);

        if (foundItems.length === 0) {
            console.log('Елементів, що містять "${searchName}", не знайдено.');
        } else {
            console.log(`Знайдено результатів: ${foundItems.length}`);
            foundItems.forEach(res => console.log(`- [${res.type}] ${res.path}`));
        }
    });

program.parse(process.argv);