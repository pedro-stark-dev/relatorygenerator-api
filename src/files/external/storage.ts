import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

export const xlsxStorage = diskStorage({
    destination: (req, file, cb) => {

        const dir = join(
            process.cwd(),
            'uploads',
            'raw',
        );

        fs.mkdirSync(dir, { recursive: true });

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        const cleanName = file.originalname
            .replace(/\s+/g, '-')
            .replace(extname(file.originalname), ''); // remove extensão

        const now = new Date();

        const date = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-');
        const time = `${String(now.getHours()).padStart(2, '0')}-${String(
            now.getMinutes(),
        ).padStart(2, '0')}`;

        const finalName = `${cleanName}${extname(file.originalname)}`;

        cb(null, finalName);
    },
});