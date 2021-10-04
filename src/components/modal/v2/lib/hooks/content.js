import arrayFind from 'core-js-pure/stable/array/find';
import { useServerData } from '../providers';

export function useProduct(view) {
    const serverData = useServerData();
    const { views } = serverData;

    return arrayFind(views, ({ meta }) => meta.product === view) ?? { content: {} };
}

export function useContent(view) {
    const { content } = useProduct(view);
    return content;
}

export function useProductMeta(view) {
    const { meta } = useProduct(view);
    return meta;
}
