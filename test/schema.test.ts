import { object, number, string, array, Success, Failure, tuple, Schema, Infer, boolean } from '../src/schema';

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
            expectedError: new Error(`Missing field in object: 'bar'`),
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
            expectedError: new Error(`Got invalid type for field: 'bar'`),
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
