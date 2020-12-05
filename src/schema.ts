export interface Success<T> {
    success: true;
    item: T;
}

export interface Failure {
    success: false;
    error: Error;
}

export type ValidationResult<T> = Failure | Success<T>;

type Validator<T> = (obj: unknown) => ValidationResult<T>;

export interface Schema<T = unknown> {
    is: Guard<Infer<Schema<T>>>;
    validate: Validator<Infer<Schema<T>>>;
}

type All = number | string;
type Guard<T = All> = (value: unknown) => value is T;

const success = <T>(obj: unknown): Success<T> => ({
    success: true,
    item: obj as T,
});

const failure = (error: Error): Failure => ({
    success: false,
    error,
});

const makeSchemaFromGuard = <T>(guard: Guard<Infer<Schema<T>>>): Schema<T> => {
    return {
        is: guard,
        validate: (obj) => (guard(obj) ? success(obj) : failure(new Error())),
    };
};

export type Infer<T> = T extends Schema<infer U>
    ? U extends Record<string, Schema> | Schema[]
        ? {
              [K in keyof U]: Infer<U[K]>;
          }
        : U extends Record<string, Schema>[] // to handle arrays of objects. TODO: can we simplify ?
        ? {
              [K in keyof U]: { [P in keyof U[K]]: Infer<U[K][P]> }; // mapped type over array, then mapped type over object
          }
        : U // U is likely a primitive, return. TODO: check if it actually is a primitive and return never if it isn't ?
    : never;

export const number = () => makeSchemaFromGuard((value): value is number => typeof value === 'number');

export const string = () => makeSchemaFromGuard((value): value is string => typeof value === 'string');

export const boolean = () => makeSchemaFromGuard((value): value is boolean => typeof value === 'boolean');

export const tuple = <T extends [Schema, ...Schema[]]>(...schemas: T): Schema<T> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T>>> => {
        if (!Array.isArray(obj)) {
            return failure(new Error(`Expected a tuple, got: '${typeof obj}'`));
        }

        if (schemas.length !== obj.length) {
            return failure(new Error(`Tuple does not have expected length ${schemas.length}, got: '${obj.length}'`));
        }

        for (const i of Array(schemas.length).keys()) {
            const result = schemas[i].validate(obj[i]);
            if (!result.success) {
                return failure(result.error);
            }
        }

        return success(obj);
    };

    return {
        is: (obj): obj is Infer<Schema<T>> => validate(obj).success,
        validate,
    };
};

export const array = <T>(schema: Schema<T>): Schema<T[]> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T[]>>> => {
        if (!Array.isArray(obj)) {
            return failure(new Error(`Expected an array, got: '${typeof obj}'`));
        }

        for (const val of obj) {
            const result = schema.validate(val);
            if (!result.success) {
                return failure(result.error);
            }
        }

        return success(obj);
    };

    return {
        is: (obj): obj is Infer<Schema<T[]>> => validate(obj).success,
        validate,
    };
};

type Indexable = Record<string, unknown>;

export const object = <T extends Record<string, Schema>>(schema: T): Schema<T> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T>>> => {
        if (typeof obj !== 'object' || obj === null) {
            return failure(new Error(`Expected an object, got: '${typeof obj}'`));
        }

        const o = obj as Indexable;
        for (const [key, val] of Object.entries(schema)) {
            if (!(key in o)) {
                return failure(new Error(`Missing field in object: '${key}'`));
            }
            if (!val.is(o[key])) {
                return failure(new Error(`Got invalid type for field: '${key}'`));
            }
        }
        return success(o);
    };

    return {
        is: (obj): obj is Infer<Schema<T>> => validate(obj).success,
        validate,
    };
};
