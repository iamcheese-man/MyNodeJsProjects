const {writeFile, writeFileSync, unlink, unlinkSync, appendFile, appendFileSync, exists, existsSync, readFile, readFileSync} = require('fs')
const path = require('path')
class DataBase {
    constructor(directory) {
        if (!directory) {
            throw new Error(`DATABASE; Invalid constructor() parameters. directory:string'`)
        }
        this.directory = directory
    }

    set(key, value) {
        const file = path.join(this.directory, 'DataBase.db')
        if (!key || !value) {
            throw new Error(`DATABASE; Invalid set() parameters. key && value`)
        }
        if (!existsSync(file)) {
            writeFileSync(file,`DBKEY:${key};:DB:;DBVALUE:${value}\n`)
        } else {
            appendFileSync(file,`DBKEY:${key};:DB:;DBVALUE:${value}\n`)
        }
        
        
    }
    get(key) {
        if (!key) {
            throw new Error('DATABASE; Invalid get() parameters. key:REQUIRED')
        }

        const file = path.join(this.directory, 'DataBase.db')
        const data = readFileSync(file, 'utf8')
        const entries = data.split('\n')

        for (const entry of entries) {
            if (!entry) continue

            let [k, v] = entry.split(';:DB:;')
            k = k.replace('DBKEY:', '')
            v = v.replace('DBVALUE:', '')

            if (k === key) {
                return v
            }
        }

        return undefined
    }
    delete(key) {
        if (!key) {
            throw new Error(`DATABASE; Invalid delete() parameters. key:REQUIRED`)
        }
        const file = path.join(this.directory, 'DataBase.db')
        const data = readFileSync(file, 'utf8')
        const entries = data.split('\n')

        for (const entry of entries) {
            if (!entry) continue

            const [k, v] = entry.split(';:DB:;')
            const Sk = k.replace('DBKEY:', '')
            const Sv = v.replace('DBVALUE:', '')
            
            if (Sk === key) {
                const newContents = data.replace(`${k};:DB:;${v}\n`, '')
                writeFileSync(file, newContents)
            }
        }
    }
}


module.exports = DataBase
