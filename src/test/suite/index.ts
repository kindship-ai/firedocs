import * as path from 'path';
import Mocha from 'mocha';
import * as fs from 'fs';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = __dirname;

    return new Promise((resolve, reject) => {
        fs.readdir(testsRoot, (err, files) => {
            if (err) {
                return reject(err);
            }

            // Add files to the test suite
            files.filter(f => f.endsWith('.test.js')).forEach(f => {
                mocha.addFile(path.resolve(testsRoot, f));
            });

            try {
                // Run the mocha test
                mocha.run((failures: number) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}
