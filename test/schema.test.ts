import {
    object,
    number,
    string,
    array,
    Success,
    Failure,
    tuple,
    Schema,
    Infer,
    boolean,
    optional,
    toGuard,
} from '../src/schema';

interface Test<T = unknown> {
    name: string;
    schema: Schema<T>;
    item: T;
    expectedError?: Error;
}

const test = ({ name, schema, item, expectedError }: Test) => {
    it(name, () => {
        const out = schema.validate(item);
        if (expectedError) {
            expect(out).toEqual<Failure>({
                success: false,
                error: expectedError,
            });
        } else {
            expect(out).toEqual<Success<unknown>>({
                success: true,
                item,
            });
        }
    });
};

describe('validates valid items', () => {
    const tests: Test[] = [
        {
            name: 'validates simple object',
            schema: object({
                foo: number(),
                bar: string(),
                foobar: boolean(),
            }),
            item: {
                foo: 1,
                bar: 'abc',
                foobar: true,
            },
        },
        {
            name: 'validates simple object with tuple',
            schema: object({
                foo: number(),
                bar: tuple(number(), string()),
            }),
            item: {
                foo: 1,
                bar: [1, '1'],
            },
        },
        {
            name: 'validates standalone tuple',
            schema: tuple(number(), string()),
            item: [1, '1'],
        },
        {
            name: 'validates simple object with nested array',
            schema: object({
                foo: number(),
                bar: array(number()),
            }),
            item: {
                foo: 1,
                bar: [1, 2, 3],
            },
        },
        {
            name: 'validates simple object with nested object',
            schema: object({
                foo: number(),
                bar: object({
                    foobar: string(),
                }),
            }),
            item: {
                foo: 1,
                bar: {
                    foobar: 'abc',
                },
            },
        },
        {
            name: 'validates object with optional field if field absent',
            schema: object({
                foo: number(),
                bar: optional(string()),
            }),
            item: {
                foo: 1,
            },
        },
        {
            name: 'validates object with optional field if field present',
            schema: object({
                foo: number(),
                bar: optional(string()),
            }),
            item: {
                foo: 1,
            },
        },
        {
            name: 'validates optional value if absent',
            schema: optional(string()),
            item: undefined,
        },
        {
            name: 'validates optional value if present',
            schema: optional(string()),
            item: 'hello world',
        },
    ];

    tests.forEach(test);
});

describe('rejects invalid items', () => {
    const tests: Test[] = [
        {
            name: 'rejects invalid object',
            schema: object({
                foo: number(),
                bar: string(),
            }),
            item: {
                foo: 1,
                foobar: 'abc',
            },
            expectedError: new Error(
                `Got invalid type for field 'bar': 'Invalid primitive. Expected string, but got undefined'`,
            ),
        },
        {
            name: 'rejects simple object with invalid nested array',
            schema: object({
                foo: number(),
                bar: array(number()),
            }),
            item: {
                foo: 1,
                bar: [1, 2, '3'],
            },
            expectedError: new Error(
                `Got invalid type for field 'bar': 'Invalid primitive. Expected number, but got string'`,
            ),
        },
    ];

    tests.forEach(test);
});

describe('Infer', () => {
    const schema = object({
        foo: object({
            foobar: string(),
        }),
        bar: tuple(
            object({
                barfoo: number(),
            }),
            number(),
            tuple(string(), number()),
        ),
        foobar: array(
            object({
                foobarbar: tuple(number()),
            }),
        ),
    });

    const item: Infer<typeof schema> = {
        foo: {
            foobar: '1',
        },
        bar: [
            {
                barfoo: 1,
            },
            2,
            ['abc', 4],
        ],
        foobar: [{ foobarbar: [1] }],
    };

    test({ name: 'Infer test 1', item, schema });
});

describe('Schema', () => {
    const item = {
        number: 1,
        negNumber: -1,
        maxNumber: Number.MAX_VALUE,
        string: 'string',
        longString:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        boolean: true,
        deeplyNested: {
            foo: 'bar',
            num: 1,
            bool: false,
        },
    };

    type ItemType = typeof item;

    const schema: Schema<ItemType> = object({
        number: number(),
        negNumber: number(),
        maxNumber: number(),
        string: string(),
        longString: string(),
        boolean: boolean(),
        deeplyNested: object({
            foo: string(),
            num: number(),
            bool: boolean(),
        }),
    });

    test({ name: 'Schema test 1', item, schema });
});

describe('schemaToGuard', () => {
    it('works', () => {
        const item = {
            number: 1,
            negNumber: -1,
            maxNumber: Number.MAX_VALUE,
            string: 'string',
            longString:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            boolean: true,
            deeplyNested: {
                foo: 'bar',
                num: 1,
                bool: false,
            },
        };

        type ItemType = typeof item;

        const schema: Schema<ItemType> = object({
            number: number(),
            negNumber: number(),
            maxNumber: number(),
            string: string(),
            longString: string(),
            boolean: boolean(),
            deeplyNested: object({
                foo: string(),
                num: number(),
                bool: boolean(),
            }),
        });

        if (!toGuard(schema)(item)) {
            fail();
        }
    });
});

describe('Inference', () => {
    it('works', () => {
        const item = {
            number: 1,
            negNumber: -1,
            maxNumber: Number.MAX_VALUE,
            string: 'string',
            longString:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
            boolean: true,
            deeplyNested: {
                foo: 'bar',
                num: 1,
                bool: false,
            },
        };

        type ItemType = typeof item;

        const schema: Schema<ItemType> = object({
            number: number(),
            negNumber: number(),
            maxNumber: number(),
            string: string(),
            longString: string(),
            boolean: boolean(),
            deeplyNested: object({
                foo: string(),
                num: number(),
                bool: boolean(),
            }),
        });

        const result = schema.validate(item);
        if (result.success) {
            const d: ItemType = result.item;
            expect(d).toEqual(item);
        } else {
            fail();
        }
    });
});
