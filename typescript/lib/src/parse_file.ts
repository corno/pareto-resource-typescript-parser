import * as p_ from 'pareto-core/implementation/query'
import * as p_i from 'pareto-core/interface/data'

import p_query from 'pareto-core/implementation/__internal/query/query'
import p_query_result from 'pareto-core/implementation/__internal/query/query_result'

//interface
import * as resources from "pareto-untyped-syntax-tree-api/interface/queries"

//data types
import * as d_ast from "pareto-untyped-syntax-tree-api/interface/data/untyped_syntax_tree"

//dependencies
import * as ts from "typescript"


// Cache for enum members sorted by value - returns primary names instead of aliases
const syntaxKindMembers: Array<[number, string]> = (() => {
    const result: Array<[number, string]> = []
    for (const name in ts.SyntaxKind) {
        const value = (ts.SyntaxKind as any)[name]
        if (typeof value === "number") {
            result.push([value, name])
        }
    }
    return result.sort((a, b) => a[0] - b[0])
})()


class My_Node_Implementation implements d_ast.Node {
    private tsNode: ts.Node

    constructor(
        tsNode: ts.Node
    ) {
        this.tsNode = tsNode
    }

    // get type(): d_ast.Node['type'] {
    //     const kind = this.tsNode.kind

    //     // Check for identifiers
    //     if (ts.isIdentifier(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.text,
    //             'type': ['identifier', null]
    //         }]
    //     }

    //     // Check for string literals
    //     if (ts.isStringLiteral(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.text, //the text property of a StringLiteral node gives the unescaped string value
    //             'type': ['string', {
    //                 'delimiter': this.tsNode.getText().startsWith("'") // the getText() method returns the full text of the node, including delimiters
    //                 ? ['apostrophe', null] 
    //                 :this.tsNode.getText().startsWith('"') 
    //                 ? ['quote', null] 
    //                 : (() => { throw new Error("Unknown string delimiter") })()
    //             }]
    //         }]
    //     }

    //     // Check for numeric literals
    //     if (ts.isNumericLiteral(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.text,
    //             'type': ['number', null]
    //         }]
    //     }

    //     // Check for template literals (check specific types directly)
    //     if (ts.isTemplateHead(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.getText(),
    //             'type': ['template', ['head', null]]
    //         }]
    //     }

    //     if (ts.isTemplateMiddle(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.getText(),
    //             'type': ['template', ['middle', null]]
    //         }]
    //     }

    //     if (ts.isTemplateTail(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.getText(),
    //             'type': ['template', ['tail', null]]
    //         }]
    //     }

    //     if (ts.isNoSubstitutionTemplateLiteral(this.tsNode)) {
    //         return ['literal', {
    //             'value': this.tsNode.getText(),
    //             'type': ['template', ['no substitution', null]]
    //         }]
    //     }

    //     // Check for JSDoc
    //     if (kind === ts.SyntaxKind.JSDoc) {
    //         return ['literal', {
    //             'value': this.tsNode.getText(),
    //             'type': ['jsdoc', null]
    //         }]
    //     }

    //     // Check for keywords and punctuation
    //     if (kind >= ts.SyntaxKind.FirstKeyword && kind <= ts.SyntaxKind.LastKeyword) {
    //         return ['keyword or punctuation', null]
    //     }

    //     // Check for other tokens (punctuation/operators)
    //     if (ts.isToken(this.tsNode)) {
    //         return ['keyword or punctuation', null]
    //     }

    //     // Everything else is structural
    //     return ['structural', null]
    // }

    get kind(): string {

        function getPrimarySyntaxKindName(kind: ts.SyntaxKind): string {
            for (const [value, name] of syntaxKindMembers) {
                if (value === kind) {
                    return name
                }
            }
            return kind.toString()
        }
        return getPrimarySyntaxKindName(this.tsNode.kind)
    }

    get text(): string {
        return this.tsNode.getText()
    }

    get children(): p_i.List<d_ast.Node> {
        const sourceFile = this.tsNode.getSourceFile()
        return p_.literal.list(
            this.tsNode.getChildren(sourceFile).map(
                child => {
                    const x: d_ast.Node = new My_Node_Implementation(child)
                    return x
                }
            )
        )
    }

    get location(): { line: number; column: number } {
        const sourceFile = this.tsNode.getSourceFile()
        const pos = this.tsNode.getStart(sourceFile)
        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos)
        return {
            line: lineAndChar.line + 1, // TypeScript uses 0-based line numbers
            column: lineAndChar.character + 1 // TypeScript uses 0-based column numbers
        }
    }

    get comments() {
        const sourceFile = this.tsNode.getSourceFile()
        const fullText = sourceFile.getFullText()
        const comments: string[] = []

        // Get leading comments (before the node)
        const leadingComments = ts.getLeadingCommentRanges(fullText, this.tsNode.pos)
        if (leadingComments) {
            leadingComments.forEach(comment => {
                comments.push(fullText.substring(comment.pos, comment.end))
            })
        }

        // skip trailing comments to avoid duplicates, as they are already captured in the leading comments of the next node


        return p_.literal.list(comments)
    }
}



export const $$: resources.queries.parse_file = p_query(
    ($) => {
        return p_query_result(
            (on_value, on_error) => {

                const dummy_fileName = "input.ts"

                const data = $.data

                // Read the file and parse it with TypeScript
                const sourceFile = ts.createSourceFile(
                    dummy_fileName,
                    data,
                    ts.ScriptTarget.Latest,
                    true // setParentNodes, needed to be able to call .getChildren()
                )



                const host: ts.CompilerHost = {
                    getSourceFile: (name) => (name === dummy_fileName ? sourceFile : undefined),
                    getDefaultLibFileName: () => "lib.d.ts",
                    writeFile: () => { },
                    getCurrentDirectory: () => "",
                    getDirectories: () => [],
                    fileExists: (name) => name === dummy_fileName,
                    readFile: () => "",
                    getCanonicalFileName: (name) => name,
                    useCaseSensitiveFileNames: () => true,
                    getNewLine: () => "\n",
                };

                const program = ts.createProgram([dummy_fileName], {}, host);

                if (program.getSyntacticDiagnostics().length > 0) {
                    on_error(['syntax errors', {
                        'messages': p_.literal.list(
                            program.getSyntacticDiagnostics().map(($): string => typeof $.messageText === "string" ? $.messageText : $.messageText.messageText)
                        )
                    }])
                    return
                }


                // Get trailing comments at the end of the file
                const fullText = sourceFile.getFullText()
                const trailingComments = ts.getTrailingCommentRanges(fullText, sourceFile.end)
                const trailingCommentsArray: string[] = []
                if (trailingComments) {
                    trailingComments.forEach(comment => {
                        trailingCommentsArray.push(fullText.substring(comment.pos, comment.end))
                    })
                }

                on_value(
                    {
                        'untyped syntax tree': {
                            'root': new My_Node_Implementation(sourceFile),
                            'trailing comments': p_.literal.list(trailingCommentsArray)
                        }
                    }
                )
            }
        )
    }
)