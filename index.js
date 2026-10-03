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

