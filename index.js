import fs from 'fs';
import { Command } from "commander";

const program = new Command();

program
    .name('disk_catalog')
    .description('Програма для перегляду каталогу на диску')
    .version('1.0.0')
    .option('-f, --file <path>', 'C:\\Users\\omele\\OneDrive - lnu.edu.ua\\web програмування на стороні сервера\\lab3\\data.json', 'data.json');

// Універсальна функція для виведення помилок
function exitWithError(message) {
    console.error(`Помилка: ${message}`);
    process.exit(1);
}

// Функція для безпечного читання файлу
function loadData(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (e) {
        exitWithError(`Не вдалося прочитати файл. Деталі: ${e.message}`);
    }
}

// Універсальна рекурсивна функція пошуку
function findElement(items, targetName, targetType = null) {
    for (const item of items) {
        const nameMatches = item.name.toLowerCase() === targetName.toLowerCase();
        const typeMatches = targetType ? (item.type === targetType) : true;

        if (nameMatches && typeMatches) return item;

        if (item.type === 'folder' && item.contents) {
            const found = findElement(item.contents, targetName, targetType);
            if (found) return found;
        }
    }
    return null;
}

// Перелік елементів
program
    .command('list')
    .description('Показати стислий перелік елементів у каталозі')
    .option('-l, --limit <number>', 'обмежити кількість виведених елементів')
    .action((options) => {
        const data = loadData(program.opts().file);
        let items = data.contents || [];

        if (options.limit) items = items.slice(0, parseInt(options.limit, 10));

        console.log(`Каталог: ${data.directoryName} (Всього елементів: ${data.totalElements})`);
        items.forEach(item => console.log(`- [${item.type.toUpperCase()}] ${item.name}`));
    });

// Один елемент повністю
program
    .command('info <name>')
    .description('Показати всі дані про конкретний файл чи папку')
    .action((name) => {
        const data = loadData(program.opts().file);
        const item = findElement(data.contents, name);

        if (!item) exitWithError(`Елемент "${name}" не знайдено.`);

        console.log(item);
    });

// Значення окремого поля
program
    .command('field <name> <fieldName>')
    .description('Показати значення конкретного поля елемента')
    .action((name, fieldName) => {
        const data = loadData(program.opts().file);
        const item = findElement(data.contents, name);

        if (!item) exitWithError(`Елемент "${name}" не знайдено.`);
        if (!(fieldName in item)) exitWithError(`Поле "${fieldName}" відсутнє у елемента "${name}".`);

        console.log(`${fieldName}: ${item[fieldName]}`);
    });

// Вміст вкладеної папки
program
    .command('folder-content <folderName>')
    .description('Показати вміст вкладеної папки')
    .option('-s, --show-hidden', 'показати також приховані елементи')
    .action((folderName, options) => {
        const data = loadData(program.opts().file);
        const folder = findElement(data.contents, folderName, 'folder');

        if (!folder) exitWithError(`Папку "${folderName}" не знайдено.`);

        let items = folder.contents || [];
        if (!options.showHidden) items = items.filter(item => item.isHidden !== true);

        console.log(`Вміст папки "${folder.name}":`);
        if (items.length === 0) {
            console.log(' (Папка порожня або приховані елементи відфільтровано)');
        } else {
            items.forEach(item => console.log(`- ${item.name} (${item.type})`));
        }
    });

// Сумарний розмір папки
program
    .command('size <folderName>')
    .description('Показати сумарний розмір папки з урахуванням вкладених файлів')
    .action((folderName) => {
        const data = loadData(program.opts().file);

        // Використовуємо універсальний пошук замість старого data.contents.find
        const folder = findElement(data.contents, folderName, 'folder');

        if (!folder) exitWithError(`Папку "${folderName}" не знайдено.`);

        function calculateTotalSize(folderObj) {
            let total = 0;
            const items = folderObj.contents || [];

            for (const item of items) {
                if (item.type === 'file') total += item.size || 0;
                else if (item.type === 'folder') total += calculateTotalSize(item);
            }
            return total;
        }

        console.log(`Загальний розмір папки "${folderName}": ${calculateTotalSize(folder)} байт.`);
    });

// Пошук файлу/папки
program
    .command('search <searchName>')
    .description('Знайти файл чи папку за назвою в усьому каталозі')
    .action((searchName) => {
        const data = loadData(program.opts().file);
        let foundItems = [];

        function searchTree(items, currentPath) {
            for (const item of items) {
                const fullPath = `${currentPath}${item.name}`;

                if (item.name.toLowerCase().includes(searchName.toLowerCase())) {
                    foundItems.push({ path: fullPath, type: item.type });
                }

                if (item.type === 'folder' && item.contents) {
                    searchTree(item.contents, `${fullPath}\\`);
                }
            }
        }

        searchTree(data.contents, data.directoryName);

        if (foundItems.length === 0) {
            console.log(`Елементів, що містять "${searchName}", не знайдено.`);
        } else {
            console.log(`Знайдено результатів: ${foundItems.length}`);
            foundItems.forEach(res => console.log(`- [${res.type}] ${res.path}`));
        }
    });

program.parse(process.argv);