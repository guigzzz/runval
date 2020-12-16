# runval
A typescript first runtime schema validation library.

This library is currently very unstable. It's probably not wise to use it (unless you want to test!)

## Usage

```ts
import { boolean, number, object, string, Infer } from '../src';

const schema = object({
    string: string(),
    number: number(),
    nestedObject: object({
        anotherNumber: number(),
        boolean: boolean(),
    }),
});

type SchemaType = Infer<typeof schema>;

const data: any = { ... };

// type guard
if (schema.is(data)) {
    // data is typeof schema
}

// validate
const output = schema.validate(data);
if (output.success) {
    const validated = output.data;
}
else {
    throw output.error;
}
```