export const getPropsWithout = (names: string[], object: any): any => Object.keys(object)
    .filter((key) => names.indexOf(key) === -1)
    .reduce((newObject, currentKey) => ({
        ...newObject,
        [currentKey]: object[currentKey]
    }), {});