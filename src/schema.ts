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
    validate: Validator<Infer<Schema<T>>>;
}

type Guard<T> = (value: unknown) => value is T;

export const toGuard = <T extends Schema>(schema: T): Guard<Infer<T>> => {
    return (obj): obj is Infer<T> => schema.validate(obj).success;
};

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
        validate,
    };
};

export const or = <T, U>(left: Schema<T>, right: Schema<U>): Schema<T | U> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T | U>>> => {
        const leftRes = left.validate(obj);
        if (leftRes.success) {
            return success(obj);
        }

        const rightRes = right.validate(obj);
        if (rightRes.success) {
            return success(obj);
        }

        return failure(new Error(`Failed or case. Left: ${leftRes.error.message}, Right: ${rightRes.error.message}`));
    };

    return {
        validate,
    };
};

export const and = <T, U>(left: Schema<T>, right: Schema<U>): Schema<T & U> => {
    const validate = (obj: unknown): ValidationResult<Infer<Schema<T & U>>> => {
        const leftRes = left.validate(obj);
        const rightRes = right.validate(obj);

        let errors = [];
        if (!leftRes.success) {
            errors.push(leftRes.error.message);
        }

        if (!rightRes.success) {
            errors.push(rightRes.error.message);
        }

        if (errors.length) {
            return failure(new Error(`Failed and case. ${errors.join(', ')}`));
        }

        return success(obj);
    };

    return {
        validate,
    };
};
