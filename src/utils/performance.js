import { getPerformance, isIE } from 'belter/src';

const namespaced = name => `__paypal_messaging_performance__${name}`;

export const performance = getPerformance();

export const PERFORMANCE_MEASURE_KEYS = {
    // the duration of time between beginning the first message render,
    // to when zoid fires its Ready event
    FIRST_RENDER_DELAY: 'firstRenderDelay',
    // the duration of time between beginning the first modal render,
    // to when zoid fires its Ready event
    FIRST_MODAL_RENDER_DELAY: 'firstModalRenderDelay',

    // the duration of time between beginning setup of messages & modals on
    // the parent page, to when zoid fires its Ready event
    SCRIPT_LOAD_DELAY: 'scriptLoadDelay',

    // (PerformanceTiming.domContentLoadedEventStart is DEPRECATED)
    // the timestamp before the DOMContentLoaded event for the parent page
    DOM_CONTENT_LOADED_EVENT_START: 'domContentLoadedEventStart',
    // (PerformanceTiming.loadEventStart is DEPRECATED)
    // when the load event was sent for the parent page
    LOAD_EVENT_START: 'loadEventStart'
};

export function getRequestMetrics() {
    const isValidMetric = metric => typeof metric !== 'undefined';
    // console.debug('getRequestDuration', window?.performance?.getEntries);
    if (typeof window?.performance?.getEntries !== 'function') {
        return -1;
    }
    // eslint-disable-next-line compat/compat
    const requests = window.performance
        .getEntries()
        .filter(
            ({ name, entryType }) =>
                (entryType === 'navigation' && `${name}`.indexOf('/credit-presentment/smart/message') > -1) ||
                (entryType === 'resource' && `${name}`.indexOf('/credit-presentment/renderMessage') > -1)
        );

    const [request] = [...requests.slice(-1), {}];
    return request;
}

export async function getRequestDuration() {
    window.request_durations = Array.isArray(window.request_durations) ? window.request_durations : [];
    const isValidMetric = metric => typeof metric === 'number';
    const getDuration = async (request, tries = 0) => {
        const { connectStart, domInteractive, responseStart, requestStart, loadEventStart, loadEventEnd } = request;
        // console.debug(
        //     'request_duration',
        //     JSON.stringify(
        //         {
        //             tries,
        //             connectStart,
        //             domInteractive,
        //             responseStart,
        //             requestStart,
        //             loadEventStart,
        //             request_duration: responseStart - requestStart
        //         },
        //         null,
        //         '    '
        //     ),
        //     requests,
        //     JSON.stringify(requests, null, '    ')
        // );
        return new Promise(resolve => {
            if (isValidMetric(loadEventStart) && loadEventStart > 0) {
                resolve(loadEventStart);
                const obj = Object.entries(JSON.parse(JSON.stringify(request))).reduce((acc, [key, val]) => {
                    if (typeof val !== 'number') {
                        return acc;
                    }
                    return {
                        ...acc,
                        [key]: typeof val !== 'number' ? undefined : val
                    };
                }, {});
                const values = Object.entries({ requestDuration: obj.responseStart - obj.requestStart, ...obj }).sort(
                    ([, a], [, b]) => {
                        if (a > b) {
                            return 1;
                        }

                        if (a < b) {
                            return -1;
                        }
                        return 0;
                    }
                );
                console.debug(values.map(([key, value]) => `${key} = ${value}`).join('\n'));

                return;
            }
            if (tries > 10) {
                resolve(-1);
                return;
            }
            setTimeout(() => {
                resolve(getDuration(request, tries + 1));
            }, 2000);
            // if(isValidMetric(responseStart) && isValidMetric(requestStart) ) {
            //     resolve(responseStart - requestStart)
            // }
        });
    };
    // console.debug('getRequestDuration', window?.performance?.getEntries);
    if (typeof window?.performance?.getEntries !== 'function') {
        return -1;
    }
    // eslint-disable-next-line compat/compat
    const requests = window.performance
        .getEntries()
        .filter(
            ({ name, entryType }) =>
                (entryType === 'navigation' && `${name}`.indexOf('/credit-presentment/smart/message') > -1) ||
                (entryType === 'resource' && `${name}`.indexOf('/credit-presentment/renderMessage') > -1)
        );

    // const [{ connectStart, domInteractive, responseStart, requestStart, loadEventStart }] = [...requests.slice(-1), {}];
    const [request] = [...requests.slice(-1), {}];

    const { connectStart, domInteractive, responseStart, requestStart, loadEventStart } = request;

    return getDuration(request);
}

export function getPerformanceMeasure(name) {
    return performance?.getEntriesByName(namespaced(name))[0]?.duration ?? -1;
}

export function getNavigationTiming(name) {
    const entry = performance?.getEntriesByType('navigation')[0];

    return entry?.[name] ?? -1;
}

export function clearPerformance() {
    if (performance) {
        Object.values(PERFORMANCE_MEASURE_KEYS).forEach(name => {
            performance.clearMarks(namespaced(name));
            performance.clearMeasures(namespaced(name));
        });
    }
}

export function addPerformanceMeasure(name, { startMark, endMark, repeat } = {}) {
    if (performance) {
        const existing = getPerformanceMeasure(name);

        // Do not track additional values for existing marks
        if (existing !== -1) {
            if (!repeat) {
                return;
            }

            performance.clearMeasures(namespaced(name));
            performance.clearMarks(namespaced(name));
        }

        /* eslint-disable no-unused-expressions, flowtype/no-unused-expressions */
        isIE()
            ? performance.measure(namespaced(name))
            : performance.measure(
                  namespaced(name),
                  startMark ? namespaced(startMark) : undefined,
                  endMark ? namespaced(endMark) : undefined
              );
        /* eslint-enable no-unused-expressions, flowtype/no-unused-expressions */
        performance.mark(namespaced(name));
    }
}
