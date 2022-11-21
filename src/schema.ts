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

const makeSchemaFromPrimitive = <T>(typeName: string): Schema<T> => {
    const guard = (obj: unknown): obj is Infer<Schema<T>> => typeof obj === typeName;
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T>>> =>
        guard(obj)
            ? success(obj)
            : failure(new Error(`Invalid primitive. Expected ${typeName}, but got ${typeof obj}`));

    return {
        is: guard,
        validate,
    };
};
export const number = () => makeSchemaFromPrimitive<number>(typeof 0);
export const string = () => makeSchemaFromPrimitive<string>(typeof '');
export const boolean = () => makeSchemaFromPrimitive<boolean>(typeof false);

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
        is: (obj: unknown): obj is Infer<Schema<T>> => validate(obj).success,
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
        is: (obj: unknown): obj is Infer<Schema<T[]>> => validate(obj).success,
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
            const res = val.validate(o[key]);
            if (!res.success) {
                return failure(new Error(`Got invalid type for field '${key}': '${res.error.message}'`));
            }
        }
        return success(o);
    };

    return {
        is: (obj: unknown): obj is Infer<Schema<T>> => validate(obj).success,
        validate,
    };
};

export const optional = <T>(schema: Schema<T>): Schema<T | undefined | null> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T | undefined | null>>> => {
        if (obj === undefined || obj === null) {
            return success(obj);
        }
        return schema.validate(obj);
    };

    return {
        is: (obj: unknown): obj is Infer<Schema<T>> => validate(obj).success,
        validate,
    };
};
