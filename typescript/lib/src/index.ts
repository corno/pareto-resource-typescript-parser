import * as p_ from 'pareto-core/interface/resource'

import { $$ as q_parse_file } from "./queries/parse_file.js"

export const $: p_.Resource = {
    'commands': {},
    'queries': {
        'parse file': q_parse_file,
    }
}