/**
 * Для возможности удобной записи булевых флагов в стиле простых атрибутов
 *
 * Angular issue: https://github.com/angular/angular/issues/14761
 */
export function CoerceBoolean(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    let coercedBooleanKey = `__${String(propertyKey)}`;
    Object.defineProperty(target, propertyKey, {
      get: function(): boolean {
        return this[coercedBooleanKey] || false;
      },
      set: function(booleanAttribute: boolean | unknown): void {
        this[coercedBooleanKey] = booleanAttribute === '' || booleanAttribute === 'true' || booleanAttribute === true;
      }
    });
  };
}
