import * as p_ from 'pareto-core/interface/resource'

import { $$ as q_parse_file } from "./queries/parse_file.js"

export const $ = {
    'commands': {},
    'queries': {
        'parse file': q_parse_file,
    }
} satisfies p_.Resource