import * as p_ from 'pareto-core/implementation/resource'
import * as p_id from 'pareto-core/interface/data'
import p_text_from_list from 'pareto-core/implementation/transformer/specials/text_from_list'

//interface
import * as resources from "pareto-untyped-syntax-tree-api/queries/interfaces"

//data types
import * as d_ast from "pareto-untyped-syntax-tree-api/schemas/untyped_syntax_tree/schema"

//dependencies
import * as ts from "typescript"

export const $$: resources.queries.parse_file = p_.query(($, on_value, on_error) => {
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

    const dummy_fileName = "input.ts"

    const data = p_text_from_list( 
        $.data,
        ($) => $
    )

    // Read the file and parse it with TypeScript
    const sourceFile = ts.createSourceFile(
        dummy_fileName,
        data,
        ts.ScriptTarget.Latest,
        true // setParentNodes, needed to be able to call .getChildren()
    )



    const host: ts.CompilerHost = {
        getSourceFile: (name) => (name === dummy_fileName
            ? sourceFile
            : undefined
        ),
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
                program.getSyntacticDiagnostics().map(($): string => typeof $.messageText === "string"
                    ? $.messageText
                    : $.messageText.messageText
                )
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


    class My_Node_Implementation implements d_ast.Node {
        private tsNode: ts.Node

        constructor(
            tsNode: ts.Node
        ) {
            this.tsNode = tsNode
        }

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

        get children(): p_id.List<d_ast.Node> {
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


    on_value(
        {
            'untyped syntax tree': {
                'root': new My_Node_Implementation(sourceFile),
                'trailing comments': p_.literal.list(trailingCommentsArray)
            }
        }
    )
})