export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'Invalid input',
          details: parsed.error.flatten(),
        }
      });
    }
    req[source === 'body' ? 'validBody' : source === 'query' ? 'validQuery' : 'validParams'] = parsed.data;
    next();
  };
}
