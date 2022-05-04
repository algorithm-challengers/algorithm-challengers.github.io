
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class User {
        constructor(name, contact, solveds) {
            this.name = name;
            this.contact = contact;
            this.solveds = solveds;
            this.easy = 0;
            this.medium = 0;
            this.hard = 0;

            for (let i = 0; i < solveds.length; i++) {
                let [date, level] = solveds[i].split(':');
                if (level === 'easy') {
                    this.easy++;
                } else if (level === 'medium') {
                    this.medium++;
                } else if (level === 'hard') {
                    this.hard++;
                }
            }

            this.score = this.easy * 10 + this.medium * 20 + this.hard * 30;
        }
    }

    let users = [];

    let user$6 = new User('냥냥이', 'Arc-Jung', [
        '2022-04-13:easy',
        '2022-04-14:easy',
        '2022-04-15:easy',
    ]);

    users.push(user$6);

    let user$5 = new User('snowmerak', 'snowmerak', [
        '2022-04-14:easy',
        '2022-04-15:easy',
        '2022-04-18:easy',
        '2022-04-19:easy',
        '2022-04-20:easy',
    ]);

    users.push(user$5);

    let user$4 = new User('lemon-mint(피치)', 'lemon-mint', [
        '2022-04-13:easy',
        '2022-04-14:easy',
        '2022-04-15:easy',
        '2022-04-18:easy',
        '2022-04-19:easy',
        '2022-04-20:easy',
    ]);

    users.push(user$4);

    let user$3 = new User('날코', 'narcotis', [
        '2022-04-13:easy',
        '2022-04-14:easy',
        '2022-04-15:easy',
        '2022-04-18:easy',
        '2022-04-19:easy',
        '2022-04-20:easy',
        '2022-04-21:easy',
        '2022-04-23:easy',
        '2022-04-26:easy',
        '2022-04-27:easy',
        '2022-05-01:medium',
    ]);

    users.push(user$3);

    let user$2 = new User('noname', 'noname0310', [
        '2022-04-19:easy',
    ]);

    users.push(user$2);

    let user$1 = new User('연유라떼', 'mistrie', [
        '2022-04-18:easy',
        '2022-04-20:easy',
    ]);

    users.push(user$1);

    let user = new User('축산협회', 'god', [
        '2022-04-14:easy',
        '2022-04-15:easy',
        '2022-04-18:easy',
        '2022-04-20:easy',
        '2022-04-21:easy',
    ]);

    users.push(user);

    class Problem {
        constructor(date, easy, medium, hard) {
            this.date = date;
            this.easy = easy;
            this.medium = medium;
            this.hard = hard;
        }
    }

    const problems = [
        new Problem('2022-05-01', 'https://leetcode.com/problems/remove-digit-from-number-to-maximize-result/', 'https://leetcode.com/problems/k-divisible-elements-subarrays/', ''),
        new Problem('2022-04-27', 'https://programmers.co.kr/learn/courses/30/lessons/42576', '', ''),
        new Problem('2022-04-26', 'https://programmers.co.kr/learn/courses/30/lessons/42862', '', ''),
        new Problem('2022-04-23', 'https://leetcode.com/problems/find-closest-number-to-zero/', '', ''),
        new Problem('2022-04-21', 'https://programmers.co.kr/learn/courses/30/lessons/1845', '',''),
        new Problem('2022-04-20', 'https://programmers.co.kr/learn/courses/30/lessons/77484', '', ''),
        new Problem('2022-04-19', 'https://programmers.co.kr/learn/courses/30/lessons/12930', '', ''),
        new Problem('2022-04-18', 'https://programmers.co.kr/learn/courses/30/lessons/81301', '', ''),
        new Problem('2022-04-15', 'https://programmers.co.kr/learn/courses/30/lessons/42748', '', ''),
        new Problem('2022-04-14', 'https://programmers.co.kr/learn/courses/30/lessons/42840', '', ''),
        new Problem('2022-04-13', 'https://programmers.co.kr/learn/courses/30/lessons/77884', '', ''),
    ];

    function isExist(value) {
        return !isUndefined(value) && !isNull(value);
    }
    function isDate(value) {
        return value instanceof Date;
    }
    function isUndefined(value) {
        return typeof value === 'undefined';
    }
    function isNull(value) {
        return value === null;
    }
    function isBoolean(value) {
        return typeof value === 'boolean';
    }
    function isNumber(value) {
        return typeof value === 'number';
    }
    function isString(value) {
        return typeof value === 'string';
    }
    function isInteger(value) {
        return isNumber(value) && isFinite(value) && Math.floor(value) === value;
    }
    function isObject(obj) {
        return typeof obj === 'object' && obj !== null;
    }
    function isFunction(value) {
        return typeof value === 'function';
    }
    function forEach(obj, cb) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cb(obj[key], key);
            }
        }
    }
    function forEachArray(arr, iteratee, context = null) {
        for (let index = 0, len = arr.length; index < len; index += 1) {
            if (iteratee.call(context, arr[index], index, arr) === false) {
                break;
            }
        }
    }
    function range(start, stop, step) {
        if (isUndefined(stop)) {
            stop = start || 0;
            start = 0;
        }
        step = step || 1;
        const arr = [];
        if (stop) {
            const flag = step < 0 ? -1 : 1;
            stop *= flag;
            for (; start * flag < stop; start += step) {
                arr.push(start);
            }
        }
        return arr;
    }
    function toArray(arrayLike) {
        let arr = [];
        try {
            arr = Array.prototype.slice.call(arrayLike);
        }
        catch (e) {
            forEachArray(arrayLike, function (value) {
                arr.push(value);
            });
        }
        return arr;
    }
    function includes(arr, searchItem, searchIndex) {
        if (typeof searchIndex === 'number' && arr[searchIndex] !== searchItem) {
            return false;
        }
        for (const item of arr) {
            if (item === searchItem) {
                return true;
            }
        }
        return false;
    }
    function pick(obj, ...propNames) {
        const resultMap = {};
        Object.keys(obj).forEach((key) => {
            if (includes(propNames, key)) {
                resultMap[key] = obj[key];
            }
        });
        return resultMap;
    }
    function omit(obj, ...propNames) {
        const resultMap = {};
        Object.keys(obj).forEach((key) => {
            if (!includes(propNames, key)) {
                resultMap[key] = obj[key];
            }
        });
        return resultMap;
    }
    function pickProperty(target, keys) {
        const { length } = keys;
        if (length) {
            for (let i = 0; i < length; i += 1) {
                if (isUndefined(target) || isNull(target)) {
                    return null;
                }
                target = target[keys[i]];
            }
        }
        return target;
    }
    function pickPropertyWithMakeup(target, args) {
        const { length } = args;
        if (length) {
            for (let i = 0; i < length; i += 1) {
                if (isUndefined(target[args[i]])) {
                    target[args[i]] = {};
                }
                target = target[args[i]];
            }
        }
        return target;
    }
    function debounce(fn, delay = 0) {
        let timer;
        function debounced(...args) {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                fn(...args);
            }, delay);
        }
        return debounced;
    }
    function deepMergedCopy(targetObj, obj) {
        const resultObj = Object.assign({}, targetObj);
        Object.keys(obj).forEach((prop) => {
            if (isObject(resultObj[prop])) {
                if (Array.isArray(obj[prop])) {
                    resultObj[prop] = deepCopyArray(obj[prop]);
                }
                else if (resultObj.hasOwnProperty(prop)) {
                    resultObj[prop] = deepMergedCopy(resultObj[prop], obj[prop]);
                }
                else {
                    resultObj[prop] = deepCopy(obj[prop]);
                }
            }
            else {
                resultObj[prop] = obj[prop];
            }
        });
        return resultObj;
    }
    function deepCopyArray(items) {
        return items.map((item) => {
            if (isObject(item)) {
                return Array.isArray(item) ? deepCopyArray(item) : deepCopy(item);
            }
            return item;
        });
    }
    function deepCopy(obj) {
        const resultObj = {};
        const keys = Object.keys(obj);
        if (!keys.length) {
            return obj;
        }
        keys.forEach((prop) => {
            if (isObject(obj[prop])) {
                resultObj[prop] = Array.isArray(obj[prop]) ? deepCopyArray(obj[prop]) : deepCopy(obj[prop]);
            }
            else {
                resultObj[prop] = obj[prop];
            }
        });
        return resultObj;
    }
    function sortCategories(x, y) {
        return isInteger(x) ? Number(x) - Number(y) : new Date(x).getTime() - new Date(y).getTime();
    }
    function sortNumber(x, y) {
        return x - y;
    }
    function last(items) {
        // eslint-disable-next-line no-undefined
        return items.length ? items[items.length - 1] : undefined;
    }
    function sum(items) {
        return items.reduce((a, b) => a + b, 0);
    }
    function hasNegativeOnly(values) {
        return values.every((value) => Number(value) <= 0);
    }
    function getFirstValidValue(values) {
        var _a;
        return (_a = values) === null || _a === void 0 ? void 0 : _a.find((value) => value !== null);
    }
    function getInitialSize(size) {
        return isNumber(size) ? size : 0;
    }
    function isAutoValue(value) {
        return value === 'auto';
    }

    const message = {
        SELECT_SERIES_API_SELECTABLE_ERROR: 'It works only when the selectable option is true.',
        SELECT_SERIES_API_INDEX_ERROR: 'The index value is invalid.',
        ALREADY_OBSERVABLE_ERROR: 'Source object is observable already',
        CIRCLE_LEGEND_RENDER_ERROR: 'circleLegend is only possible when bubble series is present',
        noDataError: (chartName) => `There's no ${chartName} data!`,
        noBrushError: (brushName) => `Brush don't exist in painter: ${brushName}`,
        DASH_SEGMENTS_UNAVAILABLE_ERROR: 'DashSegments option is available from IE11 and above.',
        SERIES_INDEX_ERROR: 'The seriesIndex value is invalid',
        AUTO_LAYOUT_CONTAINER_SIZE_ERROR: 'To use auto layout, the width or height of the container must be specified as a value such as "%" or "vh", "vw".',
    };

    let currentCollectorObserver = null;
    let currentRunningObserver = null;
    const observerCallCue = [];
    let doingInvisibleWork = false;
    function observe(fn) {
        const observer = () => {
            if (currentRunningObserver === observer) {
                return;
            }
            // If there is observer running or doing invisible work
            if (doingInvisibleWork || !isNull(currentRunningObserver)) {
                if (observerCallCue.includes(observer)) {
                    observerCallCue.splice(observerCallCue.indexOf(observer), 1);
                }
                // We use observer call cue because avoid nested observer call.
                observerCallCue.push(observer);
                // or If there are no observers running. Run the observer and run the next observer in the call queue.
            }
            else if (isNull(currentRunningObserver)) {
                currentRunningObserver = observer;
                fn();
                currentRunningObserver = null;
                digestObserverCallCue();
            }
        };
        observer.deps = [];
        // first observer excution for collect dependencies
        currentCollectorObserver = observer;
        currentCollectorObserver();
        currentCollectorObserver = null;
        return () => {
            observer.deps.forEach((dep) => {
                const index = dep.findIndex((ob) => ob === observer);
                dep.splice(index, 1);
            });
            observer.deps = [];
        };
    }
    function digestObserverCallCue() {
        if (observerCallCue.length) {
            const nextObserver = observerCallCue.shift();
            if (nextObserver) {
                nextObserver();
            }
        }
    }
    function isObservable(target) {
        return typeof target === 'object' && target.__toastUIChartOb__;
    }
    function observable(target, source = target) {
        if (isObservable(source)) {
            throw new Error(message.ALREADY_OBSERVABLE_ERROR);
        }
        if (!isObservable(target)) {
            Object.defineProperty(target, '__toastUIChartOb__', {
                enumerable: false,
            });
        }
        for (const key in source) {
            if (!source.hasOwnProperty(key)) {
                continue;
            }
            const obs = [];
            let value = source[key];
            const descriptor = Object.getOwnPropertyDescriptor(source, key);
            const preGetter = descriptor && descriptor.get;
            const preSetter = descriptor && descriptor.set;
            /* eslint-disable no-loop-func */
            Object.defineProperty(target, key, {
                configurable: true,
                enumerable: true,
                get: function () {
                    // It's some kind a trick to get observable information from closure using getter for notify()
                    if (currentCollectorObserver === observableInfo) {
                        return { target, key, value, obs };
                    }
                    if (!doingInvisibleWork &&
                        currentCollectorObserver &&
                        !obs.includes(currentCollectorObserver)) {
                        // if there is collector observer in running, collect current data as dependency
                        obs.push(currentCollectorObserver);
                        currentCollectorObserver.deps.push(obs);
                    }
                    return value;
                },
                set: function (v) {
                    const prevValue = value;
                    if (preSetter) {
                        preSetter.call(target, v);
                        value = preGetter ? preGetter.call(target) : target[key];
                    }
                    else {
                        value = v;
                    }
                    if (prevValue !== value) {
                        // Run observers
                        invokeObs(obs);
                    }
                },
            });
            if (typeof target[key] === 'object' && !Array.isArray(target[key])) {
                observable(target[key]);
            }
            /* eslint-enable no-loop-func */
        }
        return target;
    }
    function extend$1(target, source) {
        if (isObservable(source)) {
            throw new Error(message.ALREADY_OBSERVABLE_ERROR);
        }
        return observable(target, source);
    }
    function notify(target, key) {
        const obInfo = observableInfo(target, key);
        if (obInfo) {
            invokeObs(obInfo.obs);
        }
    }
    function invisibleWork(fn) {
        doingInvisibleWork = true;
        fn();
        doingInvisibleWork = false;
        digestObserverCallCue();
    }
    function notifyByPath(holder, namePath) {
        const splited = namePath.split('.');
        const key = splited.splice(splited.length - 1, 1)[0];
        const target = pickProperty(holder, splited);
        if (target) {
            notify(target, key);
        }
    }
    function invokeObs(obs) {
        obs.forEach((ob) => ob());
    }
    function observableInfo(target, key) {
        currentCollectorObserver = observableInfo;
        const obInfo = target[key];
        currentCollectorObserver = null;
        if (typeof obInfo === 'object' &&
            obInfo.hasOwnProperty('target') &&
            obInfo.hasOwnProperty('obs')) {
            return obInfo;
        }
        return null;
    }
    function computed(target, key, fn) {
        let cachedValue;
        const computedBox = {};
        Object.defineProperty(computedBox, key, {
            configurable: true,
            enumerable: true,
            get: () => cachedValue,
        });
        extend$1(target, computedBox);
        observe(() => {
            const prevValue = cachedValue;
            cachedValue = fn();
            if (prevValue !== cachedValue) {
                target[key] = cachedValue;
            }
        });
    }
    function watch(holder, path, fn) {
        const splited = path.split('.');
        const key = splited.splice(splited.length - 1, 1)[0];
        const target = pickProperty(holder, splited);
        if (!target) {
            return null;
        }
        const obInfo = observableInfo(target, key);
        if (!obInfo) {
            return null;
        }
        const watcher = () => {
            fn(target[key]);
        };
        obInfo.obs.push(watcher);
        return () => {
            const index = obInfo.obs.findIndex((ob) => ob === watcher);
            if (index > -1) {
                obInfo.obs.splice(index, 1);
            }
        };
    }
    function makeObservableObjectToNormal(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    class Store {
        constructor(initStoreState) {
            this.computed = {};
            this.actions = {};
            this.initStoreState = deepCopy(initStoreState);
            this.setRootState({});
        }
        setRootState(state) {
            observable(state);
            this.state = state;
        }
        setComputed(namePath, fn, holder = this.computed) {
            const splited = namePath.split('.');
            const key = splited.splice(splited.length - 1, 1)[0];
            const target = pickPropertyWithMakeup(holder, splited);
            computed(target, key, fn.bind(null, this.state, this.computed));
        }
        setWatch(namePath, fn) {
            return watch(this, namePath, fn);
        }
        setAction(name, fn) {
            this.actions[name] = fn;
        }
        dispatch(name, payload, isInvisible) {
            // observe.setlayout 안에서 setLayout 액션이 실행되니까 여기서 state.layout getter가 실행되고
            // state.layout의 옵져버로 observe.setLayout이 등록된다. 여기서 무한루프
            // 즉 observe하고 안에서 특정 대상을 쓸때
            // extend(state.layout, layouts); 이런식으로 하게되면 layout의 getter실행되어
            // layout을 업데이트하려고 만든 observe를 옵저버로 등록해서 무한루프
            if (isInvisible) {
                invisibleWork(() => {
                    // console.log('dispatch', name, ...args);
                    this.actions[name].call(this, this, payload);
                    // console.log('dispatch end', name);
                });
            }
            else {
                this.actions[name].call(this, this, payload);
            }
        }
        observe(fn) {
            return observe(fn.bind(this, this.state, this.computed));
        }
        observable(target) {
            return observable(target);
        }
        notifyByPath(namePath) {
            notifyByPath(this, namePath);
        }
        notify(target, key) {
            notify(target, key);
        }
        setModule(name, param) {
            if (!param) {
                param = name;
                name = param.name;
            }
            if (param.state) {
                const moduleState = typeof param.state === 'function' ? param.state(this.initStoreState) : param.state;
                extend(this.state, moduleState);
            }
            if (param.computed) {
                forEach(param.computed, (item, key) => {
                    this.setComputed(key, item);
                });
            }
            if (param.watch) {
                forEach(param.watch, (item, key) => {
                    this.setWatch(key, item);
                });
            }
            if (param.action) {
                forEach(param.action, (item, key) => {
                    this.setAction(key, item);
                });
            }
            if (param.observe) {
                forEach(param.observe, (item) => {
                    this.observe(item);
                });
            }
        }
        setValue(target, key, source) {
            extend(target, {
                [key]: source,
            });
        }
    }
    function extend(target, source) {
        const newItems = {};
        for (const k in source) {
            if (!source.hasOwnProperty(k)) {
                continue;
            }
            if (!isUndefined(target[k])) {
                if (typeof source[k] === 'object' && !Array.isArray(source[k])) {
                    extend(target[k], source[k]);
                }
                else {
                    target[k] = source[k];
                }
            }
            else {
                newItems[k] = source[k];
            }
        }
        if (Object.keys(newItems).length) {
            extend$1(target, newItems);
        }
    }

    function initialSize(containerEl, { width, height }) {
        return {
            width: width === 0 ? containerEl.offsetWidth : width,
            height: height === 0 ? containerEl.offsetHeight : height,
        };
    }
    const root = {
        name: 'root',
        state: ({ options }) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return ({
                chart: Object.assign(Object.assign({}, options.chart), { width: getInitialSize((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.chart) === null || _b === void 0 ? void 0 : _b.width), height: getInitialSize((_d = (_c = options) === null || _c === void 0 ? void 0 : _c.chart) === null || _d === void 0 ? void 0 : _d.height) }),
                usingContainerSize: {
                    width: isAutoValue((_f = (_e = options) === null || _e === void 0 ? void 0 : _e.chart) === null || _f === void 0 ? void 0 : _f.width),
                    height: isAutoValue((_h = (_g = options) === null || _g === void 0 ? void 0 : _g.chart) === null || _h === void 0 ? void 0 : _h.height),
                },
                container: {},
            });
        },
        action: {
            setChartSize({ state }, size) {
                state.chart.width = size.width;
                state.chart.height = size.height;
                this.notify(state, 'chart');
            },
            initChartSize({ state }, containerEl) {
                const { width, height } = state.chart;
                if (width === 0 || height === 0) {
                    if (containerEl.parentNode) {
                        this.dispatch('setChartSize', initialSize(containerEl, { width, height }));
                    }
                    else {
                        setTimeout(() => {
                            this.dispatch('setChartSize', initialSize(containerEl, { width, height }));
                        }, 0);
                    }
                }
            },
            setUsingContainerSize({ state }, { width, height }) {
                state.usingContainerSize.width = width;
                state.usingContainerSize.height = height;
            },
        },
    };
    var root$1 = root;

    const hexRX = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
    const rgbRX = /rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)/;
    const rgbaRX = /rgba\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3}), ?(1|0?\.?\d+)\)/;
    /**
     * Color map.
     * http://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
     * http://www.w3schools.com/HTML/html_colornames.asp
     * @ignore
     */
    const colorMap = {
        aliceblue: '#f0f8ff',
        antiquewhite: '#faebd7',
        aqua: '#00ffff',
        aquamarine: '#7fffd4',
        azure: '#f0ffff',
        beige: '#f5f5dc',
        bisque: '#ffe4c4',
        black: '#000000',
        blanchedalmond: '#ffebcd',
        blue: '#0000ff',
        blueviolet: '#8a2be2',
        brown: '#a52a2a',
        burlywood: '#deb887',
        cadetblue: '#5f9ea0',
        chartreuse: '#7fff00',
        chocolate: '#d2691e',
        coral: '#ff7f50',
        cornflowerblue: '#6495ed',
        cornsilk: '#fff8dc',
        crimson: '#dc143c',
        cyan: '#00ffff',
        darkblue: '#00008b',
        darkcyan: '#008b8b',
        darkgoldenrod: '#b8860b',
        darkgray: '#a9a9a9',
        darkgreen: '#006400',
        darkkhaki: '#bdb76b',
        darkmagenta: '#8b008b',
        darkolivegreen: '#556b2f',
        darkorange: '#ff8c00',
        darkorchid: '#9932cc',
        darkred: '#8b0000',
        darksalmon: '#e9967a',
        darkseagreen: '#8fbc8f',
        darkslateblue: '#483d8b',
        darkslategray: '#2f4f4f',
        darkturquoise: '#00ced1',
        darkviolet: '#9400d3',
        deeppink: '#ff1493',
        deepskyblue: '#00bfff',
        dimgray: '#696969',
        dodgerblue: '#1e90ff',
        firebrick: '#b22222',
        floralwhite: '#fffaf0',
        forestgreen: '#228b22',
        fuchsia: '#ff00ff',
        gainsboro: '#dcdcdc',
        ghostwhite: '#f8f8ff',
        gold: '#ffd700',
        goldenrod: '#daa520',
        gray: '#808080',
        green: '#008000',
        greenyellow: '#adff2f',
        honeydew: '#f0fff0',
        hotpink: '#ff69b4',
        indianred: '#cd5c5c',
        indigo: '#4b0082',
        ivory: '#fffff0',
        khaki: '#f0e68c',
        lavender: '#e6e6fa',
        lavenderblush: '#fff0f5',
        lawngreen: '#7cfc00',
        lemonchiffon: '#fffacd',
        lightblue: '#add8e6',
        lightcoral: '#f08080',
        lightcyan: '#e0ffff',
        lightgoldenrodyellow: '#fafad2',
        lightgrey: '#d3d3d3',
        lightgreen: '#90ee90',
        lightpink: '#ffb6c1',
        lightsalmon: '#ffa07a',
        lightseagreen: '#20b2aa',
        lightskyblue: '#87cefa',
        lightslategray: '#778899',
        lightsteelblue: '#b0c4de',
        lightyellow: '#ffffe0',
        lime: '#00ff00',
        limegreen: '#32cd32',
        linen: '#faf0e6',
        magenta: '#ff00ff',
        maroon: '#800000',
        mediumaquamarine: '#66cdaa',
        mediumblue: '#0000cd',
        mediumorchid: '#ba55d3',
        mediumpurple: '#9370d8',
        mediumseagreen: '#3cb371',
        mediumslateblue: '#7b68ee',
        mediumspringgreen: '#00fa9a',
        mediumturquoise: '#48d1cc',
        mediumvioletred: '#c71585',
        midnightblue: '#191970',
        mintcream: '#f5fffa',
        mistyrose: '#ffe4e1',
        moccasin: '#ffe4b5',
        navajowhite: '#ffdead',
        navy: '#000080',
        oldlace: '#fdf5e6',
        olive: '#808000',
        olivedrab: '#6b8e23',
        orange: '#ffa500',
        orangered: '#ff4500',
        orchid: '#da70d6',
        palegoldenrod: '#eee8aa',
        palegreen: '#98fb98',
        paleturquoise: '#afeeee',
        palevioletred: '#d87093',
        papayawhip: '#ffefd5',
        peachpuff: '#ffdab9',
        peru: '#cd853f',
        pink: '#ffc0cb',
        plum: '#dda0dd',
        powderblue: '#b0e0e6',
        purple: '#800080',
        red: '#ff0000',
        rosybrown: '#bc8f8f',
        royalblue: '#4169e1',
        saddlebrown: '#8b4513',
        salmon: '#fa8072',
        sandybrown: '#f4a460',
        seagreen: '#2e8b57',
        seashell: '#fff5ee',
        sienna: '#a0522d',
        silver: '#c0c0c0',
        skyblue: '#87ceeb',
        slateblue: '#6a5acd',
        slategray: '#708090',
        snow: '#fffafa',
        springgreen: '#00ff7f',
        steelblue: '#4682b4',
        tan: '#d2b48c',
        teal: '#008080',
        thistle: '#d8bfd8',
        tomato: '#ff6347',
        turquoise: '#40e0d0',
        violet: '#ee82ee',
        wheat: '#f5deb3',
        white: '#ffffff',
        whitesmoke: '#f5f5f5',
        yellow: '#ffff00',
        yellowgreen: '#9acd32',
    };
    function isValidRGB(str) {
        return hexRX.test(str);
    }
    function colorNameToHex(colorName) {
        return colorMap[colorName.toLowerCase()] || colorName;
    }
    // @license RGB <-> HSV conversion utilities based off of http://www.cs.rit.edu/~ncs/color/t_convert.html
    function hexToRGB(str) {
        const hexStr = colorNameToHex(str);
        if (!isValidRGB(hexStr)) {
            return false;
        }
        return hexStr
            .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
            .substring(1)
            .match(/.{2}/g)
            .map((x) => parseInt(x, 16));
    }
    function getRGBA(str, opacity) {
        const hexStr = colorNameToHex(str);
        if (isValidRGB(hexStr)) {
            const [r, g, b] = hexToRGB(hexStr);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        if (rgbRX.test(str)) {
            const match = rgbRX.exec(str);
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
        if (rgbaRX.test(str)) {
            const match = rgbaRX.exec(str);
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
        return str;
    }
    function getAlpha(str) {
        if (rgbaRX.test(str)) {
            const match = rgbaRX.exec(str);
            return Number(match[4]);
        }
        return 1;
    }
    function rgba(color, opacity = 1) {
        const alpha = getAlpha(color) * opacity;
        return getRGBA(color, alpha);
    }

    function makeStyleObj(style, styleSet) {
        return style.reduce((acc, curValue) => {
            if (isString(curValue)) {
                return Object.assign(Object.assign({}, acc), styleSet[curValue]);
            }
            return Object.assign(Object.assign({}, acc), curValue);
        }, {});
    }
    function getTranslateString(x, y) {
        return `translate(${x}px,${y}px)`;
    }
    function getTitleFontString(fontTheme) {
        const { fontFamily, fontSize, fontWeight } = fontTheme;
        return `${fontWeight} ${fontSize}px ${fontFamily}`;
    }
    function getFontStyleString(theme) {
        const { color, fontSize, fontFamily, fontWeight } = theme;
        return `font-weight: ${fontWeight}; font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${color};`;
    }
    function getFont(theme) {
        return getTitleFontString(pick(theme, 'fontFamily', 'fontWeight', 'fontSize'));
    }
    function setLineDash(ctx, dashSegments) {
        if (ctx.setLineDash) {
            ctx.setLineDash(dashSegments);
        }
    }
    function fillStyle(ctx, fillOption) {
        ctx.fillStyle = fillOption;
        ctx.fill();
    }
    function strokeWithOptions(ctx, style) {
        const { lineWidth, strokeStyle } = style;
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
        }
        if (lineWidth) {
            ctx.lineWidth = lineWidth;
        }
        if (ctx.lineWidth && getAlpha(String(ctx.strokeStyle))) {
            ctx.stroke();
        }
    }

    const DEFAULT_LABEL_TEXT = 'normal 11px Arial';
    const labelStyle = {
        default: {
            font: DEFAULT_LABEL_TEXT,
            fillStyle: '#333333',
            textAlign: 'left',
            textBaseline: 'middle',
        },
        title: {
            textBaseline: 'top',
        },
        axisTitle: {
            textBaseline: 'top',
        },
        rectLabel: {
            font: DEFAULT_LABEL_TEXT,
            fillStyle: 'rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            textBaseline: 'middle',
        },
    };
    const strokeLabelStyle = {
        none: {
            lineWidth: 1,
            strokeStyle: 'rgba(255, 255, 255, 0)',
        },
        stroke: {
            lineWidth: 4,
            strokeStyle: 'rgba(255, 255, 255, 0.5)',
        },
    };
    function label(ctx, labelModel) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const { x, y, text, style, stroke, opacity, radian, rotationPosition } = labelModel;
        if (style) {
            const styleObj = makeStyleObj(style, labelStyle);
            Object.keys(styleObj).forEach((key) => {
                ctx[key] =
                    key === 'fillStyle' && isNumber(opacity) ? rgba(styleObj[key], opacity) : styleObj[key];
            });
        }
        ctx.save();
        if (radian) {
            ctx.translate((_b = (_a = rotationPosition) === null || _a === void 0 ? void 0 : _a.x, (_b !== null && _b !== void 0 ? _b : x)), (_d = (_c = rotationPosition) === null || _c === void 0 ? void 0 : _c.y, (_d !== null && _d !== void 0 ? _d : y)));
            ctx.rotate(radian);
            ctx.translate(-(_f = (_e = rotationPosition) === null || _e === void 0 ? void 0 : _e.x, (_f !== null && _f !== void 0 ? _f : x)), -(_h = (_g = rotationPosition) === null || _g === void 0 ? void 0 : _g.y, (_h !== null && _h !== void 0 ? _h : y)));
        }
        if (stroke) {
            const strokeStyleObj = makeStyleObj(stroke, strokeLabelStyle);
            const strokeStyleKeys = Object.keys(strokeStyleObj);
            strokeStyleKeys.forEach((key) => {
                ctx[key] =
                    key === 'strokeStyle' && isNumber(opacity)
                        ? rgba(strokeStyleObj[key], opacity)
                        : strokeStyleObj[key];
            });
            if (strokeStyleKeys.length) {
                ctx.strokeText(text, x, y);
            }
        }
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    const textBubbleStyle = {
        shadow: {
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffsetY: 2,
            shadowBlur: 4,
        },
    };
    function bubbleLabel(ctx, model) {
        var _a, _b, _c, _d;
        const { radian = 0, rotationPosition, bubble: { x, y, width, height, radius = 0, lineWidth = 1, direction, points = [], fill = '#fff', strokeStyle = 'rgba(0, 0, 0, 0)', style: bubbleStyle = null, }, } = model;
        if (width > 0 && height > 0) {
            drawBubble(ctx, {
                x,
                y,
                radius,
                width,
                height,
                style: bubbleStyle,
                fill,
                strokeStyle,
                lineWidth,
                direction,
                points,
                radian,
                rotationPosition: {
                    x: (_b = (_a = rotationPosition) === null || _a === void 0 ? void 0 : _a.x, (_b !== null && _b !== void 0 ? _b : x)),
                    y: (_d = (_c = rotationPosition) === null || _c === void 0 ? void 0 : _c.y, (_d !== null && _d !== void 0 ? _d : y)),
                },
            });
        }
        if (model.label.text) {
            const { x: labelX, y: labelY, text, strokeStyle: labelStrokeColor = 'rgba(0, 0, 0, 0)', style, } = model.label;
            ctx.shadowColor = 'rgba(0, 0, 0, 0)';
            label(ctx, {
                type: 'label',
                x: labelX,
                y: labelY,
                text,
                style,
                stroke: [{ strokeStyle: labelStrokeColor }],
                radian,
                rotationPosition,
            });
        }
    }
    function drawBubbleArrow(ctx, points) {
        if (!points.length) {
            return;
        }
        ctx.lineTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
    }
    function drawBubble(ctx, model) {
        const { x, y, width, height, style, radius = 0, strokeStyle, fill, lineWidth = 1, points = [], direction = '', radian, rotationPosition, } = model;
        const right = x + width;
        const bottom = y + height;
        ctx.beginPath();
        ctx.save();
        if (radian && rotationPosition) {
            ctx.translate(rotationPosition.x, rotationPosition.y);
            ctx.rotate(radian);
            ctx.translate(-rotationPosition.x, -rotationPosition.y);
        }
        ctx.moveTo(x + radius, y);
        if (direction === 'top') {
            drawBubbleArrow(ctx, points);
        }
        ctx.lineTo(right - radius, y);
        ctx.quadraticCurveTo(right, y, right, y + radius);
        if (direction === 'right') {
            drawBubbleArrow(ctx, points);
        }
        ctx.lineTo(right, y + height - radius);
        ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
        if (direction === 'bottom') {
            drawBubbleArrow(ctx, points);
        }
        ctx.lineTo(x + radius, bottom);
        ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
        if (direction === 'left') {
            drawBubbleArrow(ctx, points);
        }
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        if (style) {
            const styleObj = makeStyleObj(style, textBubbleStyle);
            Object.keys(styleObj).forEach((key) => {
                ctx[key] = styleObj[key];
            });
        }
        if (fill) {
            fillStyle(ctx, fill);
        }
        if (strokeStyle) {
            strokeWithOptions(ctx, { strokeStyle, lineWidth });
        }
        ctx.restore();
    }

    var labelBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DEFAULT_LABEL_TEXT: DEFAULT_LABEL_TEXT,
        labelStyle: labelStyle,
        strokeLabelStyle: strokeLabelStyle,
        label: label,
        bubbleLabel: bubbleLabel
    });

    const DEGREE_180 = 180;
    const DEGREE_360 = 360;
    const DEGREE_NEGATIVE_90 = -90;
    const DEGREE_90 = 90;
    function makeAnchorPositionParam(anchor, model) {
        return Object.assign({ anchor }, pick(model, 'x', 'y', 'radius', 'degree', 'drawingStartAngle'));
    }
    function calculateDegreeToRadian(degree, drawingStartAngle = DEGREE_NEGATIVE_90) {
        let result = 0;
        if (degree % DEGREE_360 === 0) {
            result = (Math.PI / DEGREE_180) * drawingStartAngle;
        }
        else if (degree >= 0) {
            result = (Math.PI / DEGREE_180) * (degree + drawingStartAngle);
        }
        return result;
    }
    function calculateRadianToDegree(radian, drawingStartAngle = DEGREE_NEGATIVE_90) {
        return ((radian * DEGREE_180) / Math.PI - drawingStartAngle + DEGREE_360) % DEGREE_360;
    }
    function getRadialAnchorPosition(param) {
        const { anchor, x, y, radius: { inner, outer }, degree: { start, end }, drawingStartAngle = DEGREE_NEGATIVE_90, } = param;
        const halfDegree = start + (end - start) / 2;
        const radian = calculateDegreeToRadian(halfDegree, drawingStartAngle);
        const r = anchor === 'outer' ? outer : (outer + inner) / 2;
        return getRadialPosition(x, y, r, radian);
    }
    function getRadialPosition(x, y, r, radian) {
        return { x: Math.round(x + r * Math.cos(radian)), y: Math.round(y + r * Math.sin(radian)) };
    }
    function withinRadian(clockwise, startDegree, endDegree, currentDegree) {
        return clockwise
            ? startDegree <= currentDegree && endDegree >= currentDegree
            : startDegree >= currentDegree && endDegree <= currentDegree;
    }
    function getRadian(startAngle, endAngle, drawingStartAngle, needCalculateByHalf) {
        const degree = needCalculateByHalf ? (endAngle + startAngle) / 2 : startAngle;
        return calculateDegreeToRadian(degree, drawingStartAngle);
    }
    function getRadialLabelAlign(model, anchor, needCalculateByHalf = true) {
        const { totalAngle = DEGREE_360, degree: { start, end }, drawingStartAngle = DEGREE_NEGATIVE_90, } = model;
        let textAlign = 'center';
        if (anchor !== 'outer') {
            return textAlign;
        }
        const radian0 = calculateDegreeToRadian(0, drawingStartAngle);
        const halfRadian = calculateDegreeToRadian(totalAngle / 2, drawingStartAngle);
        const radian = getRadian(start, end, drawingStartAngle, needCalculateByHalf);
        if (drawingStartAngle >= DEGREE_NEGATIVE_90 && drawingStartAngle < DEGREE_90) {
            if (radian0 < radian && halfRadian > radian) {
                textAlign = 'left';
            }
            else if (halfRadian < radian) {
                textAlign = 'right';
            }
        }
        else if (radian0 < radian && halfRadian > radian) {
            textAlign = 'right';
        }
        else if (halfRadian < radian) {
            textAlign = 'left';
        }
        return textAlign;
    }

    const circleStyle = {
        default: {
            strokeStyle: '#ffffff',
            lineWidth: 2,
        },
        plot: {
            lineWidth: 1,
            strokeStyle: 'rgba(0, 0, 0, 0.05)',
        },
    };
    const rectStyle = {
        shadow: {
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 6,
        },
    };
    function clipRectArea(ctx, clipRectAreaModel) {
        const { x, y, width, height } = clipRectAreaModel;
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
    }
    function pathRect(ctx, pathRectModel) {
        const { x, y, width, height, radius = 0, stroke: strokeStyle = 'black', fill = '', lineWidth = 1, } = pathRectModel;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            fillStyle(ctx, fill);
        }
        strokeWithOptions(ctx, { lineWidth, strokeStyle });
    }
    function circle(ctx, circleModel) {
        const { x, y, style, radius, color, angle = { start: 0, end: Math.PI * 2 }, borderWidth: lineWidth, borderColor: strokeStyle, } = circleModel;
        ctx.beginPath();
        if (style) {
            const styleObj = makeStyleObj(style, circleStyle);
            Object.keys(styleObj).forEach((key) => {
                ctx[key] = styleObj[key];
            });
        }
        ctx.arc(x, y, radius, angle.start, angle.end, true);
        strokeWithOptions(ctx, { lineWidth, strokeStyle });
        fillStyle(ctx, color);
        ctx.closePath();
    }
    function line(ctx, lineModel) {
        const { x, y, x2, y2, strokeStyle, lineWidth, dashSegments } = lineModel;
        ctx.beginPath();
        if (dashSegments) {
            setLineDash(ctx, dashSegments);
        }
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        strokeWithOptions(ctx, { strokeStyle, lineWidth });
        ctx.closePath();
    }
    function rect(ctx, model) {
        const { x, y, width, height, style, thickness = 0, color, borderColor = '#ffffff' } = model;
        ctx.beginPath();
        if (style) {
            const styleObj = makeStyleObj(style, rectStyle);
            Object.keys(styleObj).forEach((key) => {
                ctx[key] = styleObj[key];
            });
        }
        if (thickness) {
            ctx.fillStyle = borderColor;
            ctx.fillRect(x - thickness, y - thickness, width + thickness * 2, height + thickness * 2);
            ctx.shadowColor = 'rgba(0, 0, 0, 0)'; // reset shadow color
        }
        ctx.rect(x, y, width, height);
        fillStyle(ctx, color);
    }
    function arc(ctx, arcModel) {
        const { x, y, angle: { start, end }, borderWidth: lineWidth, borderColor: strokeStyle, drawingStartAngle, radius, clockwise = true, } = arcModel;
        ctx.beginPath();
        const startRadian = calculateDegreeToRadian(start, drawingStartAngle);
        const endRadian = calculateDegreeToRadian(end, drawingStartAngle);
        ctx.arc(x, y, radius, startRadian, endRadian, !clockwise);
        strokeWithOptions(ctx, { lineWidth, strokeStyle });
        ctx.closePath();
    }

    var basicBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        clipRectArea: clipRectArea,
        pathRect: pathRect,
        circle: circle,
        line: line,
        rect: rect,
        arc: arc
    });

    const TICK_SIZE = 5;
    function tick(ctx, tickModel) {
        const { x, y, isYAxis, tickSize = TICK_SIZE, strokeStyle, lineWidth } = tickModel;
        const lineModel = {
            type: 'line',
            x,
            y,
            x2: x,
            y2: y,
            strokeStyle,
            lineWidth,
        };
        if (isYAxis) {
            lineModel.x2 += tickSize;
        }
        else {
            lineModel.y2 += tickSize;
        }
        line(ctx, lineModel);
    }

    var axisBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        TICK_SIZE: TICK_SIZE,
        tick: tick
    });

    const LINE_HEIGHT_NORMAL = 1.2;
    const ctx = document.createElement('canvas').getContext('2d');
    function getTextWidth(text, font = DEFAULT_LABEL_TEXT) {
        ctx.font = font;
        return Math.ceil(ctx.measureText(text).width);
    }
    /*
     * Calculate height of canvas text
     * https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics
     * */
    function getTextHeight(text, font = DEFAULT_LABEL_TEXT) {
        ctx.font = font;
        const { actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(text);
        const validActualBoundingBox = isNumber(actualBoundingBoxAscent) && isNumber(actualBoundingBoxDescent);
        return validActualBoundingBox
            ? Math.ceil(Math.abs(actualBoundingBoxAscent) + Math.abs(actualBoundingBoxDescent)) + 1
            : getFontHeight(font);
    }
    function getFontHeight(font = DEFAULT_LABEL_TEXT) {
        const fontSize = font.match(/\d+(?=px)/);
        return parseInt(String(Number(fontSize) * LINE_HEIGHT_NORMAL), 10);
    }
    function getAxisLabelAnchorPoint(labelHeight) {
        return crispPixel(TICK_SIZE * 2 + labelHeight / 2);
    }
    function getDecimalLength(value) {
        var _a, _b;
        return _b = (_a = String(value).split('.')[1]) === null || _a === void 0 ? void 0 : _a.length, (_b !== null && _b !== void 0 ? _b : 0);
    }
    function findMultipleNum(...args) {
        const underPointLens = args.map((value) => getDecimalLength(value));
        const underPointLen = Math.max(...underPointLens);
        return Math.pow(10, underPointLen);
    }
    function add(a, b) {
        const multipleNum = findMultipleNum(a, b);
        return (a * multipleNum + b * multipleNum) / multipleNum;
    }
    function multiply(a, b) {
        const multipleNum = findMultipleNum(a, b);
        return (a * multipleNum * (b * multipleNum)) / (multipleNum * multipleNum);
    }
    function divide(a, b) {
        const multipleNum = findMultipleNum(a, b);
        return (a * multipleNum) / (b * multipleNum);
    }
    function divisors(value) {
        const result = [];
        for (let a = 2, b; a * a <= value; a += 1) {
            if (value % a === 0) {
                b = value / a;
                result.push(a);
                if (b !== a) {
                    result.push(b);
                }
            }
        }
        return result.sort((prev, next) => prev - next);
    }
    function makeLabelsFromLimit(limit, stepSize, isDateType) {
        const multipleNum = findMultipleNum(stepSize);
        const min = Math.round(limit.min * multipleNum);
        const max = Math.round(limit.max * multipleNum);
        const labels = range(min, max + 1, stepSize * multipleNum);
        return labels.map((label) => {
            return String(isDateType ? new Date(label) : label / multipleNum);
        });
    }
    function makeTickPixelPositions(size, count, additionalPosition = 0, remainLastBlockIntervalPosition = 0) {
        let positions = [];
        if (count > 0) {
            positions = range(0, count).map((index) => {
                const ratio = index === 0 ? 0 : index / (count - 1);
                return ratio * size + additionalPosition;
            });
        }
        if (remainLastBlockIntervalPosition) {
            positions.push(remainLastBlockIntervalPosition);
        }
        return positions;
    }
    function crispPixel(pixel, thickness = 1) {
        const halfThickness = thickness / 2;
        return thickness % 2
            ? (isInteger(pixel) ? pixel : Math.round(pixel - halfThickness)) + halfThickness
            : Math.round(pixel);
    }
    function getControlPoints(prev, cur, next) {
        // http://scaledinnovation.com/analytics/splines/aboutSplines.html
        const TENSION = 0.333;
        const { x: x0, y: y0 } = prev;
        const { x: x1, y: y1 } = cur;
        const { x: x2, y: y2 } = next;
        const d12 = getDistance(next, cur);
        const d01 = getDistance(cur, prev);
        const fa = (TENSION * d01) / (d01 + d12) || 0; // scaling factor for triangle Ta
        const fb = (TENSION * d12) / (d01 + d12) || 0; // ditto for Tb, simplifies to fb=t-fa
        return {
            prev: {
                x: x1 - fa * (x2 - x0),
                y: y1 - fa * (y2 - y0),
            },
            next: { x: x1 + fb * (x2 - x0), y: y1 + fb * (y2 - y0) },
        };
    }
    function setSplineControlPoint(points) {
        for (let i = 0, pointsSize = points.length, prev = points[0]; i < pointsSize; i += 1) {
            const point = points[i];
            if (isNull(point)) {
                prev = points[i + 1];
                continue;
            }
            const next = points[Math.min(i + 1, pointsSize - 1) % pointsSize];
            if (prev && next) {
                point.controlPoint = getControlPoints(prev, point, next);
            }
            prev = point;
        }
    }
    function getValueRatio(value, { min, max }) {
        if (max === min) {
            return 0;
        }
        return (value - min) / (max - min);
    }
    function getDistance(point1, point2) {
        return Math.sqrt(Math.pow((point2.x - point1.x), 2) + Math.pow((point2.y - point1.y), 2));
    }
    function getXPosition(axisData, offsetSize, value, dataIndex) {
        const { pointOnColumn, tickDistance, labelRange } = axisData;
        let x;
        if (labelRange) {
            const xValue = isString(value) ? Number(new Date(value)) : Number(value);
            const xValueRatio = getValueRatio(xValue, labelRange);
            x = xValueRatio * offsetSize;
        }
        else {
            x = tickDistance * dataIndex + (pointOnColumn ? tickDistance / 2 : 0);
        }
        return x;
    }

    function isSameArray(arr1, arr2) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        for (let i = 0; i < arr1.length; i += 1) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        return true;
    }

    class Component {
        constructor({ store, eventBus }) {
            this.name = 'Component';
            this.type = 'component';
            this.rect = {
                x: 0,
                y: 0,
                height: 0,
                width: 0,
            };
            this.isShow = true;
            this.store = store;
            this.eventBus = eventBus;
        }
        update(delta) {
            if (!this.drawModels) {
                return;
            }
            if (Array.isArray(this.models)) {
                this.updateModels(this.drawModels, this.models, delta);
            }
            else {
                Object.keys(this.models).forEach((type) => {
                    const currentModels = this.drawModels[type];
                    const targetModels = this.models[type];
                    this.updateModels(currentModels, targetModels, delta);
                });
            }
        }
        initUpdate(delta) {
            this.update(delta);
        }
        updateModels(currentModels, targetModels, delta) {
            currentModels.forEach((current, index) => {
                const target = targetModels[index];
                Object.keys(current).forEach((key) => {
                    var _a;
                    if (!current || !target) {
                        return;
                    }
                    if (key[0] !== '_') {
                        if (isNumber(current[key])) {
                            current[key] = current[key] + (target[key] - current[key]) * delta;
                        }
                        else if (key === 'points') {
                            const matchedModel = this.getCurrentModelToMatchTargetModel(current[key], current[key], target[key]);
                            const newPoints = matchedModel.map((curPoint, idx) => {
                                const next = target[key][idx];
                                if (curPoint && next) {
                                    const { x, y } = curPoint;
                                    const { x: nextX, y: nextY } = next;
                                    return Object.assign(Object.assign({}, next), { x: x + (nextX - x) * delta, y: y + (nextY - y) * delta });
                                }
                                return next;
                            });
                            if ((_a = this.store.state.options.series) === null || _a === void 0 ? void 0 : _a.spline) {
                                setSplineControlPoint(newPoints);
                            }
                            current[key] = newPoints;
                        }
                        else {
                            current[key] = target[key];
                        }
                    }
                });
            });
        }
        sync() {
            if (!this.drawModels) {
                return;
            }
            if (Array.isArray(this.models)) {
                this.syncModels(this.drawModels, this.models);
            }
            else if (!Object.keys(this.models).length) {
                this.drawModels = this.models;
            }
            else {
                Object.keys(this.models).forEach((type) => {
                    const currentModels = this.drawModels[type];
                    const targetModels = this.models[type];
                    this.syncModels(currentModels, targetModels, type);
                });
            }
        }
        getCurrentModelToMatchTargetModel(models, currentModels, targetModels) {
            var _a;
            if (!models || !currentModels) {
                return [...targetModels];
            }
            if ((_a = getFirstValidValue(targetModels)) === null || _a === void 0 ? void 0 : _a.name) {
                const modelNames = [...new Set(models.map(({ name }) => name))];
                const targetNames = [...new Set(targetModels.map(({ name }) => name))];
                const same = isSameArray(modelNames, targetNames);
                if (!same) {
                    return this.getCurrentModelWithDifferentModel(models, currentModels, targetModels, modelNames, targetNames);
                }
            }
            const currentLength = currentModels.length;
            const targetLength = targetModels.length;
            if (currentLength < targetLength) {
                return [...currentModels, ...targetModels.slice(currentLength, targetLength)];
            }
            if (currentLength > targetLength) {
                return currentModels.slice(0, targetLength);
            }
            return models;
        }
        getCurrentModelWithDifferentModel(models, currentModels, targetModels, modelNames, targetNames) {
            const currentLength = currentModels.length;
            const targetLength = targetModels.length;
            if (currentLength > targetLength) {
                const newModels = models.filter(({ name }) => includes(targetNames, name));
                return newModels.length !== targetModels.length ? targetModels : newModels;
            }
            if (currentLength < targetLength) {
                const notIncludedModels = targetModels.reduce((acc, cur, idx) => {
                    const notIncluded = !includes(modelNames, cur.name);
                    return notIncluded
                        ? {
                            models: [...acc.models, cur],
                            modelIdx: [...acc.modelIdx, idx],
                        }
                        : acc;
                }, { models: [], modelIdx: [] });
                if (models.length + notIncludedModels.models.length === targetLength) {
                    const newModels = [...models];
                    notIncludedModels.models.forEach((model, idx) => {
                        newModels.splice(notIncludedModels.modelIdx[idx], 0, model);
                    });
                    return newModels;
                }
                return targetModels;
            }
            return models;
        }
        syncModels(currentModels, targetModels, type) {
            const drawModels = type ? this.drawModels[type] : this.drawModels;
            const model = this.getCurrentModelToMatchTargetModel(drawModels, currentModels, targetModels);
            if (type) {
                this.drawModels[type] = model;
            }
            else {
                this.drawModels = model;
            }
        }
        getSelectableOption(options) {
            var _a, _b, _c;
            return _c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.selectable, (_c !== null && _c !== void 0 ? _c : false);
        }
        renderDataLabels(data, name) {
            setTimeout(() => {
                this.eventBus.emit('renderDataLabels', { data, name: (name !== null && name !== void 0 ? name : this.name) });
            }, 0);
        }
        draw(painter) {
            const models = this.drawModels ? this.drawModels : this.models;
            if (Array.isArray(models)) {
                painter.paintForEach(models);
            }
            else if (models) {
                Object.keys(models).forEach((item) => {
                    painter.paintForEach(models[item]);
                });
            }
        }
    }

    var AxisType;
    (function (AxisType) {
        AxisType["X"] = "xAxis";
        AxisType["Y"] = "yAxis";
        AxisType["SECONDARY_Y"] = "secondaryYAxis";
        AxisType["CIRCULAR"] = "circularAxis";
        AxisType["VERTICAL"] = "verticalAxis";
    })(AxisType || (AxisType = {}));
    function getOffsetAndAnchorKey(hasBasedYAxis) {
        return {
            offsetKey: hasBasedYAxis ? 'y' : 'x',
            anchorKey: hasBasedYAxis ? 'x' : 'y',
        };
    }
    class Axis extends Component {
        constructor() {
            super(...arguments);
            this.models = { label: [], tick: [], axisLine: [] };
            this.axisSize = 0;
        }
        initialize({ name }) {
            this.type = 'axis';
            this.name = name;
            this.yAxisComponent = includes([AxisType.Y, AxisType.SECONDARY_Y], name);
        }
        render({ layout, axes, theme, scale }) {
            var _a;
            if (axes.centerYAxis || !axes[this.name]) {
                return;
            }
            this.theme = getAxisTheme(theme, this.name);
            this.rect = layout[this.name];
            this.axisSize = this.yAxisComponent ? this.rect.height : this.rect.width;
            const { viewLabels } = axes[this.name];
            const { offsetKey, anchorKey } = getOffsetAndAnchorKey(this.yAxisComponent);
            const renderOptions = this.makeRenderOptions(axes[this.name], (_a = scale) === null || _a === void 0 ? void 0 : _a[this.name]);
            const hasOnlyAxisLine = this.hasOnlyAxisLine();
            if (!hasOnlyAxisLine) {
                this.models.label = this.renderLabelModels(viewLabels, offsetKey, anchorKey, renderOptions);
                this.models.tick = this.renderTickModels(offsetKey, anchorKey, renderOptions);
            }
            this.models.axisLine = [this.renderAxisLineModel()];
            if (!this.drawModels) {
                this.drawModels = {
                    tick: [],
                    label: [],
                    axisLine: this.models.axisLine,
                };
                ['tick', 'label'].forEach((type) => {
                    this.drawModels[type] = this.models[type].map((m) => {
                        const drawModel = Object.assign({}, m);
                        if (this.yAxisComponent) {
                            drawModel.y = 0;
                        }
                        else {
                            drawModel.x = 0;
                        }
                        return drawModel;
                    });
                });
            }
        }
        renderAxisLineModel() {
            const zeroPixel = crispPixel(0);
            let lineModel;
            const { color: strokeStyle, width: lineWidth } = this.theme;
            if (this.yAxisComponent) {
                const x = this.getYAxisXPoint();
                lineModel = {
                    type: 'line',
                    x,
                    y: zeroPixel,
                    x2: x,
                    y2: crispPixel(this.axisSize),
                    strokeStyle,
                    lineWidth,
                };
            }
            else {
                lineModel = {
                    type: 'line',
                    x: zeroPixel,
                    y: zeroPixel,
                    x2: crispPixel(this.axisSize),
                    y2: zeroPixel,
                    strokeStyle,
                    lineWidth,
                };
            }
            return lineModel;
        }
        renderTickModels(offsetKey, anchorKey, renderOptions) {
            const tickAnchorPoint = this.yAxisComponent ? this.getYAxisXPoint() : crispPixel(0);
            const { tickInterval, relativePositions } = renderOptions;
            const tickSize = includes([AxisType.SECONDARY_Y, AxisType.X], this.name)
                ? TICK_SIZE
                : -TICK_SIZE;
            return relativePositions.reduce((positions, position, index) => {
                return index % tickInterval
                    ? positions
                    : [
                        ...positions,
                        {
                            type: 'tick',
                            isYAxis: this.yAxisComponent,
                            tickSize,
                            [offsetKey]: crispPixel(position),
                            [anchorKey]: tickAnchorPoint,
                            strokeStyle: this.theme.color,
                            lineWidth: this.theme.width,
                        },
                    ];
            }, []);
        }
        renderLabelModels(labels, offsetKey, anchorKey, renderOptions) {
            const { needRotateLabel, radian, offsetY } = renderOptions;
            const labelTheme = this.theme.label;
            const font = getTitleFontString(labelTheme);
            const textAlign = this.getLabelTextAlign(needRotateLabel);
            const style = ['default', { textAlign, font, fillStyle: labelTheme.color }];
            const labelAnchorPoint = this.yAxisComponent ? this.getYAxisAnchorPoint() : offsetY;
            return labels.map(({ text, offsetPos }) => ({
                type: 'label',
                text,
                style,
                radian,
                [offsetKey]: crispPixel(offsetPos),
                [anchorKey]: labelAnchorPoint,
            }));
        }
        makeRenderOptions(axisData, scale) {
            var _a, _b, _c, _d;
            const { tickCount, tickInterval } = axisData;
            const sizeRatio = (_b = (_a = scale) === null || _a === void 0 ? void 0 : _a.sizeRatio, (_b !== null && _b !== void 0 ? _b : 1));
            const positionRatio = (_d = (_c = scale) === null || _c === void 0 ? void 0 : _c.positionRatio, (_d !== null && _d !== void 0 ? _d : 0));
            const relativePositions = makeTickPixelPositions(this.axisSize * sizeRatio, tickCount, this.axisSize * positionRatio);
            if (this.yAxisComponent) {
                return {
                    relativePositions,
                    tickInterval,
                };
            }
            const { needRotateLabel, radian, offsetY } = axisData;
            return {
                relativePositions,
                tickInterval,
                needRotateLabel,
                radian,
                offsetY,
            };
        }
        getYAxisAnchorPoint() {
            return this.isRightSide() ? crispPixel(this.rect.width) : crispPixel(0);
        }
        getLabelTextAlign(needRotateLabel) {
            const yAxisTextAlign = this.isRightSide() ? 'right' : 'left';
            const xAxisTextAlign = needRotateLabel ? 'left' : 'center';
            return this.yAxisComponent ? yAxisTextAlign : xAxisTextAlign;
        }
        isRightSide() {
            return this.name === AxisType.SECONDARY_Y;
        }
        getYAxisXPoint() {
            return this.isRightSide() ? crispPixel(0) : crispPixel(this.rect.width);
        }
        hasOnlyAxisLine() {
            return ((this.yAxisComponent && !this.rect.width) || (this.name === AxisType.X && !this.rect.height));
        }
    }

    const RAD = Math.PI / 180;
    const ANGLE_90 = 90;
    const ANGLE_CANDIDATES = [0, 25, 45, 65, 85, 90];
    /**
     * Calculate adjacent.
     *
     *   H : Hypotenuse
     *   A : Adjacent
     *   O : Opposite
     *   D : Degree
     *
     *        /|
     *       / |
     *    H /  | O
     *     /   |
     *    /\ D |
     *    -----
     *       A
     */
    function calculateAdjacent(degree, hypotenuse) {
        return Math.cos(degree * RAD) * hypotenuse;
    }
    function calculateOpposite(degree, hypotenuse) {
        return Math.sin(degree * RAD) * hypotenuse;
    }
    function calculateRotatedWidth(degree, width, height) {
        const centerHalf = calculateAdjacent(degree, width / 2);
        const sideHalf = calculateAdjacent(ANGLE_90 - degree, height / 2);
        return (centerHalf + sideHalf) * 2;
    }
    function calculateRotatedHeight(degree, width, height) {
        const centerHalf = calculateOpposite(degree, width / 2);
        const sideHalf = calculateOpposite(ANGLE_90 - degree, height / 2);
        return (centerHalf + sideHalf) * 2;
    }

    // https://github.com/nhn/tui.code-snippet/blob/master/formatDate/formatDate.js
    const DEFAULT_DATE_FORMAT = 'YY-MM-DD hh:mm:ss';
    function getDateFormat(date) {
        if (!date) {
            return;
        }
        return isObject(date) ? date.format : DEFAULT_DATE_FORMAT;
    }
    const tokens = /[\\]*YYYY|[\\]*YY|[\\]*MMMM|[\\]*MMM|[\\]*MM|[\\]*M|[\\]*DD|[\\]*D|[\\]*HH|[\\]*H|[\\]*mm|[\\]*m|[\\]*ss|[\\]*s|[\\]*A/gi;
    const MONTH_STR = [
        'Invalid month',
        'January',
        'February',
        'March',
        'April',
        'May',
        'Jun',
        'Jul',
        'August',
        'September',
        'October',
        'November',
        'December',
    ];
    const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const replaceMap = {
        M: (date) => Number(date.month),
        MM: (date) => {
            const month = date.month;
            return Number(month) < 10 ? `0${month}` : month;
        },
        MMM: (date) => MONTH_STR[Number(date.month)].substr(0, 3),
        MMMM: (date) => MONTH_STR[Number(date.month)],
        D: (date) => Number(date.date),
        d: (date) => replaceMap.D(date),
        DD: (date) => {
            const dayInMonth = date.date;
            return Number(dayInMonth) < 10 ? `0${dayInMonth}` : dayInMonth;
        },
        dd: (date) => replaceMap.DD(date),
        YY: (date) => Number(date.year) % 100,
        yy: (date) => replaceMap.YY(date),
        YYYY: (date) => {
            let prefix = '20';
            const year = date.year;
            if (year > 69 && year < 100) {
                prefix = '19';
            }
            return Number(year) < 100 ? prefix + String(year) : year;
        },
        yyyy: (date) => replaceMap.YYYY(date),
        A: (date) => date.meridiem,
        a: (date) => date.meridiem,
        hh: (date) => {
            const hour = date.hour;
            return Number(hour) < 10 ? '0' + hour : hour;
        },
        HH: (date) => replaceMap.hh(date),
        h: (date) => String(Number(date.hour)),
        H: (date) => replaceMap.h(date),
        m: (date) => String(Number(date.minute)),
        mm: (date) => {
            const minute = date.minute;
            return Number(minute) < 10 ? `0${minute}` : minute;
        },
        s: (date) => String(Number(date.second)),
        ss: (date) => {
            const second = date.second;
            return Number(second) < 10 ? `0${second}` : second;
        },
    };
    function isLeapYear(month, year) {
        return month === 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    function isValidDate(y, m, d) {
        const year = Number(y);
        const month = Number(m);
        const date = Number(d);
        const isValidYear = (year > -1 && year < 100) || (year > 1969 && year < 2070);
        const isValidMonth = month > 0 && month < 13;
        if (!isValidYear || !isValidMonth) {
            return false;
        }
        const lastDayInMonth = isLeapYear(month, year) ? 29 : MONTH_DAYS[month];
        return date > 0 && date <= lastDayInMonth;
    }
    /*
     * key             | Shorthand
     * --------------- |-----------------------
     * years           | YY / YYYY / yy / yyyy
     * months(n)       | M / MM
     * months(str)     | MMM / MMMM
     * days            | D / DD / d / dd
     * hours           | H / HH / h / hh
     * minutes         | m / mm
     * seconds         | s / ss
     * meridiem(AM,PM) | A / a
     */
    function formatDate(form, date, option) {
        var _a, _b, _c;
        const am = (_b = (_a = option) === null || _a === void 0 ? void 0 : _a.meridiemSet.AM, (_b !== null && _b !== void 0 ? _b : 'AM'));
        const pm = ((_c = option) === null || _c === void 0 ? void 0 : _c.meridiemSet.PM) || 'PM';
        let nDate;
        if (isDate(date)) {
            nDate = {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                date: date.getDate(),
                hour: date.getHours(),
                minute: date.getMinutes(),
                second: date.getSeconds(),
            };
        }
        else {
            const { year, month, hour, minute, second } = date;
            nDate = { year, month, date: date.date, hour, minute, second };
        }
        if (!isValidDate(nDate.year, nDate.month, nDate.date)) {
            return '';
        }
        nDate.meridiem = '';
        if (/([^\\]|^)[aA]\b/.test(form)) {
            if (nDate.hour > 12) {
                // See the clock system: https://en.wikipedia.org/wiki/12-hour_clock
                nDate.hour %= 12;
            }
            if (nDate.hour === 0) {
                nDate.hour = 12;
            }
            nDate.meridiem = nDate.hour > 11 ? pm : am;
        }
        return form.replace(tokens, (key) => {
            if (key.indexOf('\\') > -1) {
                // escape character
                return key.replace(/\\/, '');
            }
            return replaceMap[key](nDate) || '';
        });
    }

    function hasNestedPieSeries(series) {
        var _a;
        return !!(series.pie && Array.isArray((_a = series.pie[0]) === null || _a === void 0 ? void 0 : _a.data));
    }
    function getNestedPieChartAliasNames(series) {
        return series.pie.map(({ name }) => name);
    }
    function pieTooltipLabelFormatter(percentValue) {
        const percentageString = percentValue.toFixed(2);
        const percent = parseFloat(percentageString);
        const needSlice = percentageString.length > 5;
        return `${needSlice ? parseFloat(percentageString.substr(0, 4)) : String(percent)}%`;
    }
    function hasOuterDataLabel(options, series) {
        var _a, _b, _c;
        return !!series.pie && ((_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.dataLabels) === null || _c === void 0 ? void 0 : _c.anchor) === 'outer';
    }
    function hasOuterPieSeriesName(options, series) {
        var _a, _b, _c, _d;
        return (!!series.pie &&
            ((_d = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.dataLabels) === null || _c === void 0 ? void 0 : _c.pieSeriesName) === null || _d === void 0 ? void 0 : _d.anchor) === 'outer');
    }

    var RadialAxisType;
    (function (RadialAxisType) {
        RadialAxisType["CIRCULAR"] = "circularAxis";
        RadialAxisType["VERTICAL"] = "verticalAxis";
    })(RadialAxisType || (RadialAxisType = {}));

    function makeAdjustingIntervalInfo(blockCount, axisWidth, blockSize) {
        let remainBlockCount;
        let newBlockCount = Math.floor(axisWidth / blockSize);
        let intervalInfo = null;
        const interval = newBlockCount ? Math.floor(blockCount / newBlockCount) : blockCount;
        if (interval > 1) {
            // remainBlockCount : remaining block count after filling new blocks
            // | | | | | | | | | | | |  - previous block interval
            // |     |     |     |      - new block interval
            //                   |*|*|  - remaining block
            remainBlockCount = blockCount - interval * newBlockCount;
            if (remainBlockCount >= interval) {
                newBlockCount += Math.floor(remainBlockCount / interval);
                remainBlockCount = remainBlockCount % interval;
            }
            intervalInfo = {
                blockCount: newBlockCount,
                remainBlockCount,
                interval,
            };
        }
        return intervalInfo;
    }
    function getAutoAdjustingInterval(count, axisWidth, categories) {
        var _a;
        const autoInterval = {
            MIN_WIDTH: 90,
            MAX_WIDTH: 121,
            STEP_SIZE: 5,
        };
        const LABEL_MARGIN = 5;
        if ((_a = categories) === null || _a === void 0 ? void 0 : _a[0]) {
            const categoryMinWidth = getTextWidth(categories[0]);
            if (categoryMinWidth < axisWidth / count - LABEL_MARGIN) {
                return 1;
            }
        }
        let candidates = [];
        divisors(count).forEach((interval) => {
            const intervalWidth = (interval / count) * axisWidth;
            if (intervalWidth >= autoInterval.MIN_WIDTH && intervalWidth <= autoInterval.MAX_WIDTH) {
                candidates.push({ interval, blockCount: Math.floor(count / interval), remainBlockCount: 0 });
            }
        });
        if (!candidates.length) {
            const blockSizeRange = range(autoInterval.MIN_WIDTH, autoInterval.MAX_WIDTH, autoInterval.STEP_SIZE);
            candidates = blockSizeRange.reduce((acc, blockSize) => {
                const candidate = makeAdjustingIntervalInfo(count, axisWidth, blockSize);
                return candidate ? [...acc, candidate] : acc;
            }, []);
        }
        let tickInterval = 1;
        if (candidates.length) {
            const candidate = candidates.reduce((acc, cur) => (cur.blockCount > acc.blockCount ? cur : acc), { blockCount: 0, interval: 1 });
            tickInterval = candidate.interval;
        }
        return tickInterval;
    }
    function isLabelAxisOnYAxis({ series, options, categories, }) {
        var _a, _b;
        return (!!series.bar ||
            !!series.radialBar ||
            (!!series.gauge && Array.isArray(categories) && !categories.length) ||
            (!!series.bullet && !((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.vertical)));
    }
    function hasBoxTypeSeries(series) {
        return !!series.column || !!series.bar || !!series.boxPlot || !!series.bullet;
    }
    function isPointOnColumn(series, options) {
        var _a;
        if (hasBoxTypeSeries(series)) {
            return true;
        }
        if (series.line || series.area) {
            return Boolean((_a = options.xAxis) === null || _a === void 0 ? void 0 : _a.pointOnColumn);
        }
        return false;
    }
    function isSeriesUsingRadialAxes(series) {
        return !!series.radar || !!series.radialBar || !!series.gauge;
    }
    function getAxisNameUsingRadialAxes(labelAxisOnYAxis) {
        return {
            valueAxisName: labelAxisOnYAxis ? 'circularAxis' : 'verticalAxis',
            labelAxisName: labelAxisOnYAxis ? 'verticalAxis' : 'circularAxis',
        };
    }
    function getAxisName(labelAxisOnYAxis, series) {
        return isSeriesUsingRadialAxes(series)
            ? getAxisNameUsingRadialAxes(labelAxisOnYAxis)
            : {
                valueAxisName: labelAxisOnYAxis ? 'xAxis' : 'yAxis',
                labelAxisName: labelAxisOnYAxis ? 'yAxis' : 'xAxis',
            };
    }
    function getSizeKey(labelAxisOnYAxis) {
        return {
            valueSizeKey: labelAxisOnYAxis ? 'width' : 'height',
            labelSizeKey: labelAxisOnYAxis ? 'height' : 'width',
        };
    }
    function hasSecondaryYAxis(options) {
        var _a;
        return Array.isArray((_a = options) === null || _a === void 0 ? void 0 : _a.yAxis) && options.yAxis.length === 2;
    }
    function getYAxisOption(options) {
        var _a;
        const secondaryYAxis = hasSecondaryYAxis(options);
        return {
            yAxis: secondaryYAxis ? options.yAxis[0] : (_a = options) === null || _a === void 0 ? void 0 : _a.yAxis,
            secondaryYAxis: secondaryYAxis ? options.yAxis[1] : null,
        };
    }
    function getValueAxisName(options, seriesName, valueAxisName) {
        var _a;
        const { secondaryYAxis } = getYAxisOption(options);
        return ((_a = secondaryYAxis) === null || _a === void 0 ? void 0 : _a.chartType) === seriesName ? 'secondaryYAxis' : valueAxisName;
    }
    function getValueAxisNames(options, valueAxisName) {
        if (includes([AxisType.X, AxisType.CIRCULAR, AxisType.VERTICAL], valueAxisName)) {
            return [valueAxisName];
        }
        const optionsUsingYAxis = options;
        const { yAxis, secondaryYAxis } = getYAxisOption(optionsUsingYAxis);
        return secondaryYAxis
            ? [yAxis.chartType, secondaryYAxis.chartType].map((seriesName, index) => seriesName
                ? getValueAxisName(optionsUsingYAxis, seriesName, valueAxisName)
                : ['yAxis', 'secondaryYAxis'][index])
            : [valueAxisName];
    }
    function getAxisTheme(theme, name) {
        const { xAxis, yAxis, circularAxis } = theme;
        let axisTheme;
        if (name === AxisType.X) {
            axisTheme = xAxis;
        }
        else if (Array.isArray(yAxis)) {
            axisTheme = name === AxisType.Y ? yAxis[0] : yAxis[1];
        }
        else if (name === RadialAxisType.CIRCULAR) {
            axisTheme = circularAxis;
        }
        else {
            axisTheme = yAxis;
        }
        return axisTheme;
    }
    function getRotationDegree(distance, labelWidth, labelHeight, axisLayout) {
        let degree = 0;
        ANGLE_CANDIDATES.every((angle) => {
            const compareWidth = calculateRotatedWidth(angle, labelWidth, labelHeight);
            degree = angle;
            return compareWidth > distance || compareWidth / 2 > axisLayout.x;
        });
        return distance < labelWidth || labelWidth / 2 > axisLayout.x ? degree : 0;
    }
    function hasYAxisMaxLabelLengthChanged(previousAxes, currentAxes, field) {
        var _a, _b;
        const prevYAxis = previousAxes[field];
        const yAxis = currentAxes[field];
        if (!prevYAxis && !yAxis) {
            return false;
        }
        return ((_a = prevYAxis) === null || _a === void 0 ? void 0 : _a.maxLabelWidth) !== ((_b = yAxis) === null || _b === void 0 ? void 0 : _b.maxLabelWidth);
    }
    function hasYAxisTypeMaxLabelChanged(previousAxes, currentAxes) {
        return (hasYAxisMaxLabelLengthChanged(previousAxes, currentAxes, 'yAxis') ||
            hasYAxisMaxLabelLengthChanged(previousAxes, currentAxes, 'secondaryYAxis'));
    }
    function hasXAxisSizeChanged(previousAxes, currentAxes) {
        const { maxHeight: prevMaxHeight } = previousAxes.xAxis;
        const { maxHeight } = currentAxes.xAxis;
        return prevMaxHeight !== maxHeight;
    }
    function hasAxesLayoutChanged(previousAxes, currentAxes) {
        return (hasYAxisTypeMaxLabelChanged(previousAxes, currentAxes) ||
            hasXAxisSizeChanged(previousAxes, currentAxes));
    }
    function getRotatableOption(options) {
        var _a, _b, _c, _d;
        return _d = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.xAxis) === null || _b === void 0 ? void 0 : _b.label) === null || _c === void 0 ? void 0 : _c.rotatable, (_d !== null && _d !== void 0 ? _d : true);
    }
    function getViewAxisLabels(axisData, axisSize) {
        var _a, _b, _c, _d;
        const { labels, pointOnColumn, labelDistance, tickDistance, labelInterval, tickInterval, tickCount, scale, } = axisData;
        let axisSizeAppliedRatio = axisSize;
        let additional = 0;
        let labelAdjustment = 0;
        if (scale) {
            const sizeRatio = (_b = (_a = scale) === null || _a === void 0 ? void 0 : _a.sizeRatio, (_b !== null && _b !== void 0 ? _b : 1));
            const positionRatio = (_d = (_c = scale) === null || _c === void 0 ? void 0 : _c.positionRatio, (_d !== null && _d !== void 0 ? _d : 0));
            axisSizeAppliedRatio = axisSize * sizeRatio;
            additional = axisSize * positionRatio;
        }
        else {
            const interval = labelInterval === tickInterval ? labelInterval : 1;
            labelAdjustment = pointOnColumn ? ((labelDistance !== null && labelDistance !== void 0 ? labelDistance : tickDistance * interval)) / 2 : 0;
        }
        const relativePositions = makeTickPixelPositions(axisSizeAppliedRatio, tickCount, additional);
        return labels.reduce((acc, text, index) => {
            const offsetPos = relativePositions[index] + labelAdjustment;
            const needRender = !(index % labelInterval) && offsetPos <= axisSize;
            return needRender ? [...acc, { offsetPos, text }] : acc;
        }, []);
    }
    function makeTitleOption(title) {
        if (isUndefined(title)) {
            return title;
        }
        const defaultOption = { text: '', offsetX: 0, offsetY: 0 };
        return isString(title) ? Object.assign(Object.assign({}, defaultOption), { text: title }) : Object.assign(Object.assign({}, defaultOption), title);
    }
    function getAxisFormatter(options, axisName) {
        var _a, _b, _c;
        const axisOptions = Object.assign(Object.assign({}, getYAxisOption(options)), { xAxis: options.xAxis });
        return _c = (_b = (_a = axisOptions[axisName]) === null || _a === void 0 ? void 0 : _a.label) === null || _b === void 0 ? void 0 : _b.formatter, (_c !== null && _c !== void 0 ? _c : ((value) => value));
    }
    function getLabelsAppliedFormatter(labels, options, dateType, axisName) {
        var _a, _b;
        const dateFormatter = getDateFormat((_b = (_a = options) === null || _a === void 0 ? void 0 : _a[axisName]) === null || _b === void 0 ? void 0 : _b.date);
        const formattedLabels = dateType && dateFormatter
            ? labels.map((label) => formatDate(dateFormatter, new Date(label)))
            : labels;
        const formatter = getAxisFormatter(options, axisName);
        return formattedLabels.map((label, index) => formatter(label, { index, labels, axisName }));
    }
    function makeRotationData(maxLabelWidth, maxLabelHeight, distance, rotatable, axisLayout) {
        const degree = getRotationDegree(distance, maxLabelWidth, maxLabelHeight, axisLayout);
        if (!rotatable || degree === 0) {
            return {
                needRotateLabel: false,
                radian: 0,
                rotationHeight: maxLabelHeight,
            };
        }
        return {
            needRotateLabel: degree > 0,
            radian: calculateDegreeToRadian(degree, 0),
            rotationHeight: calculateRotatedHeight(degree, maxLabelWidth, maxLabelHeight),
        };
    }
    function getMaxLabelSize(labels, xMargin, font = DEFAULT_LABEL_TEXT) {
        const maxLengthLabel = labels.reduce((acc, cur) => (acc.length > cur.length ? acc : cur), '');
        return {
            maxLabelWidth: getTextWidth(maxLengthLabel, font) + xMargin,
            maxLabelHeight: getTextHeight(maxLengthLabel, font),
        };
    }
    function getLabelXMargin(axisName, options) {
        var _a, _b, _c, _d;
        if (axisName === 'xAxis') {
            return 0;
        }
        const axisOptions = getYAxisOption(options);
        return Math.abs((_d = (_c = (_b = (_a = axisOptions) === null || _a === void 0 ? void 0 : _a[axisName]) === null || _b === void 0 ? void 0 : _b.label) === null || _c === void 0 ? void 0 : _c.margin, (_d !== null && _d !== void 0 ? _d : 0)));
    }
    function getInitAxisIntervalData(isLabelAxis, params) {
        var _a, _b, _c, _d, _e, _f;
        const { axis, categories, layout, isCoordinateTypeChart } = params;
        const tickInterval = (_b = (_a = axis) === null || _a === void 0 ? void 0 : _a.tick) === null || _b === void 0 ? void 0 : _b.interval;
        const labelInterval = (_d = (_c = axis) === null || _c === void 0 ? void 0 : _c.label) === null || _d === void 0 ? void 0 : _d.interval;
        const existIntervalOptions = isNumber(tickInterval) || isNumber(labelInterval);
        const needAdjustInterval = isLabelAxis &&
            !isNumber((_f = (_e = axis) === null || _e === void 0 ? void 0 : _e.scale) === null || _f === void 0 ? void 0 : _f.stepSize) &&
            !params.shift &&
            !existIntervalOptions &&
            !isCoordinateTypeChart;
        const initTickInterval = needAdjustInterval ? getInitTickInterval(categories, layout) : 1;
        const initLabelInterval = needAdjustInterval ? initTickInterval : 1;
        const axisData = {
            tickInterval: (tickInterval !== null && tickInterval !== void 0 ? tickInterval : initTickInterval),
            labelInterval: (labelInterval !== null && labelInterval !== void 0 ? labelInterval : initLabelInterval),
        };
        return axisData;
    }
    function getInitTickInterval(categories, layout) {
        if (!categories || !layout) {
            return 1;
        }
        const { width } = layout.xAxis;
        const count = categories.length;
        return getAutoAdjustingInterval(count, width, categories);
    }
    function isDateType(options, axisName) {
        var _a;
        return !!((_a = options[axisName]) === null || _a === void 0 ? void 0 : _a.date);
    }

    function getCoordinateYValue(datum) {
        if (isNumber(datum)) {
            return datum;
        }
        return Array.isArray(datum) ? datum[1] : datum.y;
    }
    function getCoordinateXValue(datum) {
        return Array.isArray(datum) ? datum[0] : datum.x;
    }
    function isValueAfterLastCategory(value, categories) {
        const category = last(categories);
        if (!category) {
            return false;
        }
        return isNumber(value) ? value >= Number(category) : new Date(value) >= new Date(category);
    }
    function getCoordinateDataIndex(datum, categories, dataIndex, startIndex) {
        if (isNumber(datum)) {
            return dataIndex - startIndex;
        }
        const value = getCoordinateXValue(datum);
        let index = categories.findIndex((category) => category === String(value));
        if (index === -1 && isValueAfterLastCategory(value, categories)) {
            index = categories.length;
        }
        return index;
    }
    function isLineCoordinateSeries(series) {
        var _a;
        if (!series.line) {
            return false;
        }
        const firstData = getFirstValidValue((_a = series.line[0]) === null || _a === void 0 ? void 0 : _a.data);
        return firstData && (Array.isArray(firstData) || isObject(firstData));
    }
    function isCoordinateSeries(series) {
        return isLineCoordinateSeries(series) || !!series.scatter || !!series.bubble;
    }
    function isModelExistingInRect(rect, point) {
        const { height, width } = rect;
        const { x, y } = point;
        return x >= 0 && x <= width && y >= 0 && y <= height;
    }
    function isMouseInRect(rect, mousePosition) {
        const { x, y, width, height } = rect;
        return (mousePosition.x >= x &&
            mousePosition.x <= x + width &&
            mousePosition.y >= y &&
            mousePosition.y <= y + height);
    }

    function isCenterYAxis(options) {
        var _a, _b;
        const diverging = !!pickProperty(options, ['series', 'diverging']);
        const alignCenter = ((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.yAxis) === null || _b === void 0 ? void 0 : _b.align) === 'center';
        return diverging && alignCenter;
    }
    function isDivergingBoxSeries(series, options) {
        var _a;
        return hasBoxTypeSeries(series) && !!((_a = options.series) === null || _a === void 0 ? void 0 : _a.diverging);
    }
    function getZeroPosition(limit, axisSize, labelAxisOnYAxis, isDivergingSeries) {
        const { min, max } = limit;
        const hasZeroValue = min <= 0 && max >= 0;
        if (!hasZeroValue || isDivergingSeries) {
            return null;
        }
        const position = ((0 - min) / (max - min)) * axisSize;
        return labelAxisOnYAxis ? position : axisSize - position;
    }
    function getLabelAxisData(stateProp) {
        const { axisSize, categories, series, options, theme, scale, initialAxisData, isCoordinateTypeChart, axisName, } = stateProp;
        const hasLineSeries = !!series.line;
        const pointOnColumn = isPointOnColumn(series, options);
        const dateType = isDateType(options, axisName);
        const labelsBeforeFormatting = isCoordinateTypeChart
            ? makeLabelsFromLimit(scale.limit, scale.stepSize, dateType)
            : categories;
        const labels = getLabelsAppliedFormatter(labelsBeforeFormatting, options, dateType, axisName);
        let labelRange;
        if (scale && hasLineSeries) {
            const baseLabels = pointOnColumn ? labelsBeforeFormatting : categories;
            const values = baseLabels.map((value) => (dateType ? Number(new Date(value)) : Number(value)));
            labelRange = { min: Math.min(...values), max: Math.max(...values) };
        }
        const rectResponderCount = categories.length;
        const tickIntervalCount = rectResponderCount - (pointOnColumn ? 0 : 1);
        const tickDistance = tickIntervalCount ? axisSize / tickIntervalCount : axisSize;
        const labelDistance = axisSize / (labels.length - (pointOnColumn ? 0 : 1));
        let tickCount = labels.length;
        if (pointOnColumn && !isCoordinateTypeChart) {
            tickCount += 1;
        }
        const viewLabels = getViewAxisLabels(Object.assign({ labels,
            pointOnColumn,
            tickDistance,
            tickCount,
            scale }, initialAxisData), axisSize);
        const axisLabelMargin = getLabelXMargin(axisName, options);
        return Object.assign(Object.assign({ labels,
            viewLabels,
            pointOnColumn,
            labelDistance,
            tickDistance,
            tickCount,
            labelRange,
            rectResponderCount, isLabelAxis: true }, initialAxisData), getMaxLabelSize(labels, axisLabelMargin, getTitleFontString(theme.label)));
    }
    function getValueAxisData(stateProp) {
        var _a;
        const { scale, axisSize, series, options, centerYAxis, initialAxisData, theme, labelOnYAxis, axisName, } = stateProp;
        const { limit, stepSize } = scale;
        const size = centerYAxis ? (_a = centerYAxis) === null || _a === void 0 ? void 0 : _a.xAxisHalfSize : axisSize;
        const divergingBoxSeries = isDivergingBoxSeries(series, options);
        const formatter = getAxisFormatter(options, axisName);
        const zeroPosition = getZeroPosition(limit, axisSize, isLabelAxisOnYAxis({ series, options }), divergingBoxSeries);
        let valueLabels = makeLabelsFromLimit(limit, stepSize);
        if (!centerYAxis && divergingBoxSeries) {
            valueLabels = getDivergingValues(valueLabels);
        }
        const labels = valueLabels.map((label, index) => formatter(label, { index, labels: valueLabels, axisName }));
        const tickDistance = size / Math.max(valueLabels.length, 1);
        const tickCount = valueLabels.length;
        const pointOnColumn = false;
        const viewLabels = getViewAxisLabels(Object.assign({ labels: labelOnYAxis ? labels : [...labels].reverse(), pointOnColumn,
            tickDistance,
            tickCount }, initialAxisData), size);
        const axisLabelMargin = getLabelXMargin(axisName, options);
        const axisData = Object.assign(Object.assign({ labels,
            viewLabels,
            pointOnColumn, isLabelAxis: false, tickCount,
            tickDistance }, initialAxisData), getMaxLabelSize(labels, axisLabelMargin, getTitleFontString(theme.label)));
        if (isNumber(zeroPosition)) {
            axisData.zeroPosition = zeroPosition;
        }
        return axisData;
    }
    function getDivergingValues(valueLabels) {
        return hasNegativeOnly(valueLabels)
            ? valueLabels.reverse().slice(1).concat(valueLabels)
            : valueLabels.slice(1).reverse().concat(valueLabels);
    }
    function makeDefaultAxisData(isLabelAxis, params) {
        var _a, _b;
        const axisData = getInitAxisIntervalData(isLabelAxis, params);
        const title = makeTitleOption((_b = (_a = params) === null || _a === void 0 ? void 0 : _a.axis) === null || _b === void 0 ? void 0 : _b.title);
        if (title) {
            axisData.title = title;
        }
        return axisData;
    }
    function getInitialAxisData(options, labelOnYAxis, categories, layout, isCoordinateTypeChart) {
        var _a, _b, _c;
        const { yAxis, secondaryYAxis } = getYAxisOption(options);
        const shift = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.shift;
        return {
            xAxis: makeDefaultAxisData(!labelOnYAxis, {
                categories,
                axis: (_c = options) === null || _c === void 0 ? void 0 : _c.xAxis,
                layout,
                shift,
                isCoordinateTypeChart,
            }),
            yAxis: makeDefaultAxisData(labelOnYAxis, { axis: yAxis }),
            secondaryYAxis: secondaryYAxis
                ? makeDefaultAxisData(labelOnYAxis, { axis: secondaryYAxis })
                : null,
        };
    }
    function getSecondaryYAxisData({ state, labelOnYAxis, valueAxisSize, labelAxisSize, initialAxisData, isCoordinateTypeChart, }) {
        var _a, _b;
        const { scale, options, series, theme } = state;
        const categories = state.categories;
        return labelOnYAxis
            ? getLabelAxisData({
                scale: scale.secondaryYAxis,
                axisSize: labelAxisSize,
                categories: (_b = (_a = getYAxisOption(options).secondaryYAxis) === null || _a === void 0 ? void 0 : _a.categories, (_b !== null && _b !== void 0 ? _b : categories)),
                options,
                series,
                theme: getAxisTheme(theme, AxisType.SECONDARY_Y),
                initialAxisData,
                isCoordinateTypeChart,
                axisName: AxisType.SECONDARY_Y,
            })
            : getValueAxisData({
                scale: scale.secondaryYAxis,
                axisSize: valueAxisSize,
                options,
                series,
                theme: getAxisTheme(theme, AxisType.SECONDARY_Y),
                centerYAxis: null,
                initialAxisData,
                axisName: AxisType.SECONDARY_Y,
            });
    }
    function makeXAxisData({ axisData, axisSize, axisLayout, centerYAxis, rotatable, labelMargin = 0, }) {
        const { viewLabels, pointOnColumn, maxLabelWidth, maxLabelHeight } = axisData;
        const offsetY = getAxisLabelAnchorPoint(maxLabelHeight) + labelMargin;
        const size = centerYAxis ? centerYAxis.xAxisHalfSize : axisSize;
        const distance = size / (viewLabels.length - (pointOnColumn ? 0 : 1));
        const rotationData = makeRotationData(maxLabelWidth, maxLabelHeight, distance, rotatable, axisLayout);
        const { needRotateLabel, rotationHeight } = rotationData;
        const maxHeight = (needRotateLabel ? rotationHeight : maxLabelHeight) + offsetY;
        return Object.assign(Object.assign(Object.assign({}, axisData), rotationData), { maxHeight,
            offsetY });
    }
    function getAxisInfo(labelOnYAxis, plot, series) {
        const { valueAxisName, labelAxisName } = getAxisName(labelOnYAxis, series);
        const { valueSizeKey, labelSizeKey } = getSizeKey(labelOnYAxis);
        const valueAxisSize = plot[valueSizeKey];
        const labelAxisSize = plot[labelSizeKey];
        return { valueAxisName, valueAxisSize, labelAxisName, labelAxisSize };
    }
    function getCategoriesWithTypes(categories, rawCategories) {
        var _a, _b;
        return {
            categories: (_a = categories, (_a !== null && _a !== void 0 ? _a : [])),
            rawCategories: (_b = rawCategories, (_b !== null && _b !== void 0 ? _b : [])),
        };
    }
    const axes = {
        name: 'axes',
        state: ({ series, options }) => {
            const { secondaryYAxis } = getYAxisOption(options);
            const axesState = {
                xAxis: {},
                yAxis: {},
            };
            if (!!series.bar && isCenterYAxis(options)) {
                axesState.centerYAxis = {};
            }
            if (secondaryYAxis) {
                axesState.secondaryYAxis = {};
            }
            return {
                axes: axesState,
            };
        },
        action: {
            setAxesData({ state, initStoreState }) {
                var _a, _b;
                const { scale, options, series, layout, theme } = state;
                const { xAxis, yAxis, plot } = layout;
                const isCoordinateTypeChart = isCoordinateSeries(initStoreState.series);
                const labelOnYAxis = isLabelAxisOnYAxis({ series, options });
                const { categories } = getCategoriesWithTypes(state.categories, state.rawCategories);
                const { valueAxisName, valueAxisSize, labelAxisName, labelAxisSize } = getAxisInfo(labelOnYAxis, plot, series);
                const hasCenterYAxis = state.axes.centerYAxis;
                const initialAxisData = getInitialAxisData(options, labelOnYAxis, categories, layout, isCoordinateTypeChart);
                const valueAxisData = getValueAxisData({
                    scale: scale[valueAxisName],
                    axisSize: valueAxisSize,
                    options,
                    series,
                    theme: getAxisTheme(theme, valueAxisName),
                    centerYAxis: hasCenterYAxis
                        ? {
                            xAxisHalfSize: (xAxis.width - yAxis.width) / 2,
                        }
                        : null,
                    initialAxisData: initialAxisData[valueAxisName],
                    labelOnYAxis,
                    axisName: valueAxisName,
                });
                const labelAxisData = getLabelAxisData({
                    scale: scale[labelAxisName],
                    axisSize: labelAxisSize,
                    categories,
                    options,
                    series,
                    theme: getAxisTheme(theme, labelAxisName),
                    initialAxisData: initialAxisData[labelAxisName],
                    isCoordinateTypeChart,
                    labelOnYAxis,
                    axisName: labelAxisName,
                });
                let secondaryYAxis, centerYAxis;
                if (state.axes.secondaryYAxis) {
                    secondaryYAxis = getSecondaryYAxisData({
                        state,
                        labelOnYAxis,
                        valueAxisSize,
                        labelAxisSize,
                        labelAxisName,
                        valueAxisName,
                        initialAxisData: initialAxisData.secondaryYAxis,
                        isCoordinateTypeChart,
                    });
                }
                if (hasCenterYAxis) {
                    const xAxisHalfSize = (xAxis.width - yAxis.width) / 2;
                    centerYAxis = deepMergedCopy(valueAxisData, {
                        x: xAxis.x + xAxisHalfSize,
                        xAxisHalfSize,
                        secondStartX: (xAxis.width + yAxis.width) / 2,
                        yAxisLabelAnchorPoint: yAxis.width / 2,
                        yAxisHeight: yAxis.height,
                    });
                }
                const axesState = {
                    xAxis: makeXAxisData({
                        axisData: labelOnYAxis ? valueAxisData : labelAxisData,
                        axisSize: labelOnYAxis ? valueAxisSize : labelAxisSize,
                        axisLayout: layout.xAxis,
                        centerYAxis,
                        rotatable: getRotatableOption(options),
                        labelMargin: (_b = (_a = options.xAxis) === null || _a === void 0 ? void 0 : _a.label) === null || _b === void 0 ? void 0 : _b.margin,
                    }),
                    yAxis: labelOnYAxis ? labelAxisData : valueAxisData,
                    secondaryYAxis,
                    centerYAxis,
                };
                if (hasAxesLayoutChanged(state.axes, axesState)) {
                    this.notify(state, 'layout');
                }
                state.axes = axesState;
            },
        },
        computed: {},
        observe: {
            updateAxes() {
                this.dispatch('setAxesData');
            },
        },
    };
    var axes$1 = axes;

    const DATA_URI_HEADERS = {
        xls: 'data:application/vnd.ms-excel;base64,',
        csv: 'data:text/csv;charset=utf-8,%EF%BB%BF' /* BOM for utf-8 */,
    };
    function getDownloadMethod() {
        let method;
        const isDownloadAttributeSupported = !isUndefined(document.createElement('a').download);
        const isMSSaveOrOpenBlobSupported = !isUndefined(window.Blob && window.navigator.msSaveOrOpenBlob);
        if (isMSSaveOrOpenBlobSupported) {
            method = downloadWithMSSaveOrOpenBlob;
        }
        else if (isDownloadAttributeSupported) {
            method = downloadWithAnchorElementDownloadAttribute;
        }
        return method;
    }
    /**
     * Base64 string to blob
     * original source ref: https://github.com/miguelmota/base64toblob/blob/master/base64toblob.js
     * Licence: MIT Licence
     */
    function base64toBlob(base64String) {
        const contentType = base64String
            .substr(0, base64String.indexOf(';base64,'))
            .substr(base64String.indexOf(':') + 1);
        const sliceSize = 1024;
        const byteCharacters = atob(base64String.substr(base64String.indexOf(',') + 1));
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i += 1) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new window.Uint8Array(byteNumbers));
        }
        try {
            // for IE 11
            return new Blob(byteArrays, { type: contentType });
        }
        catch (e) {
            // for IE 10
            return new Blob(byteArrays.map((byteArr) => byteArr.buffer), { type: contentType });
        }
    }
    function isImageExtension(extension) {
        return extension === 'jpeg' || extension === 'png';
    }
    function downloadWithMSSaveOrOpenBlob(fileName, extension, content, contentType) {
        const blobObject = isImageExtension(extension)
            ? base64toBlob(content)
            : new Blob([content], { type: contentType });
        window.navigator.msSaveOrOpenBlob(blobObject, `${fileName}.${extension}`);
    }
    function downloadWithAnchorElementDownloadAttribute(fileName, extension, content) {
        if (content) {
            const anchorElement = document.createElement('a');
            anchorElement.href = content;
            anchorElement.target = '_blank';
            anchorElement.download = `${fileName}.${extension}`;
            document.body.appendChild(anchorElement);
            anchorElement.click();
            anchorElement.remove();
        }
    }
    function oneLineTrim(...args) {
        const normalTag = (template, ...expressions) => template.reduce((accumulator, part, i) => accumulator + expressions[i - 1] + part);
        return normalTag(...args).replace(/\n\s*/g, '');
    }
    function isNeedDataEncoding() {
        const isDownloadAttributeSupported = !isUndefined(document.createElement('a').download);
        const isMSSaveOrOpenBlobSupported = !isUndefined(window.Blob && window.navigator.msSaveOrOpenBlob);
        return !isMSSaveOrOpenBlobSupported && isDownloadAttributeSupported;
    }
    function getBulletLongestArrayLength(arr, field) {
        return arr.reduce((acc, cur, idx) => { var _a, _b; return (!idx || acc < ((_b = (_a = cur) === null || _a === void 0 ? void 0 : _a[field]) === null || _b === void 0 ? void 0 : _b.length) ? cur[field].length : acc); }, 0);
    }
    function makeBulletExportData({ series }) {
        const seriesData = series.bullet.data;
        const markerCount = getBulletLongestArrayLength(seriesData, 'markers');
        const rangeCount = getBulletLongestArrayLength(seriesData, 'ranges');
        const rangesHeaders = range(0, rangeCount).map((idx) => `Range ${idx + 1}`);
        const markerHeaders = range(0, markerCount).map((idx) => `Marker ${idx + 1}`);
        return seriesData.reduce((acc, { data, markers, name, ranges }) => {
            const rangeDatum = rangesHeaders.map((_, index) => {
                var _a;
                const rangeData = (_a = ranges) === null || _a === void 0 ? void 0 : _a[index];
                return rangeData ? `${rangeData[0]} ~ ${rangeData[1]}` : '';
            });
            const markerDatum = markerHeaders.map((_, index) => { var _a, _b; return _b = (_a = markers) === null || _a === void 0 ? void 0 : _a[index], (_b !== null && _b !== void 0 ? _b : ''); });
            return [...acc, [name, (data !== null && data !== void 0 ? data : ''), ...rangeDatum, ...markerDatum]];
        }, [['', 'Actual', ...rangesHeaders, ...markerHeaders]]);
    }
    function makeHeatmapExportData({ categories, series }) {
        const xCategories = categories.x;
        return series.heatmap.data.reduce((acc, { data, yCategory }) => [
            ...acc,
            [yCategory, ...data.map((datum) => (isNull(datum) ? '' : datum))],
        ], [['', ...xCategories]]);
    }
    function recursiveTreemapData({ label, data, children = [] }, result) {
        if (data) {
            result.push([label, data]);
        }
        children.forEach((childrenData) => recursiveTreemapData(childrenData, result));
        return result;
    }
    function makeTreemapExportData(exportData) {
        const { series } = exportData;
        const result = [['Label', 'Data']];
        series.treemap.data.forEach((datum) => {
            recursiveTreemapData(datum, result);
        });
        return result;
    }
    function makeBubbleExportData(exportData) {
        const { series } = exportData;
        return series.bubble.data.reduce((acc, { name, data }) => [
            ...acc,
            ...data.map((datum) => isNull(datum) ? [] : [name, datum.label, String(datum.x), datum.y, datum.r]),
        ], [['Name', 'Label', 'X', 'Y', 'Radius']]);
    }
    function makeBoxPlotExportData(exportData) {
        var _a;
        const { series } = exportData;
        const categories = (_a = exportData.categories, (_a !== null && _a !== void 0 ? _a : []));
        return series.boxPlot.data.reduce((acc, { name, data, outliers }) => {
            const values = ((data !== null && data !== void 0 ? data : [])).map((rawData, index) => {
                var _a;
                const outlierValue = (_a = ((outliers !== null && outliers !== void 0 ? outliers : [])).find((outlier) => outlier[0] === index)) === null || _a === void 0 ? void 0 : _a[1];
                const value = outlierValue ? [...rawData, outlierValue] : [...rawData];
                return value.join();
            });
            return [...acc, [name, ...values]];
        }, [['', ...categories]]);
    }
    function makePieExportData(exportData) {
        var _a;
        const { series } = exportData;
        const categories = (_a = exportData.categories, (_a !== null && _a !== void 0 ? _a : []));
        return series.pie.data.reduce((acc, { name, data }) => {
            const values = Array.isArray(data)
                ? ((data !== null && data !== void 0 ? data : [])).reduce((accNestedPieValue, value) => {
                    var _a;
                    return [...accNestedPieValue, [value.name, (_a = value.data, (_a !== null && _a !== void 0 ? _a : ''))]];
                }, [])
                : [[name, (data !== null && data !== void 0 ? data : '')]];
            return [...acc, ...values];
        }, categories.length ? [['', ...categories]] : []);
    }
    function makeCoordinateExportDataValues(type, categories, data) {
        return categories.map((category, index) => {
            if (type === 'area' && Array.isArray(data[index])) {
                return data[index].join();
            }
            const foundItem = data.find((value) => category === String(getCoordinateXValue(value)));
            return foundItem ? getCoordinateYValue(foundItem) : '';
        });
    }
    function makeExportData(exportData) {
        const { series } = exportData;
        const categories = exportData.categories;
        return Object.keys(series).reduce((acc, type) => {
            const result = series[type].data.map(({ name, data }) => {
                const values = !isNumber(getFirstValidValue(data)) && includes(['line', 'area', 'scatter'], type)
                    ? makeCoordinateExportDataValues(type, categories, data)
                    : data.map((value) => (Array.isArray(value) ? value.join() : value));
                return [name, ...values];
            });
            return [...acc, ...result];
        }, series.gauge ? [] : [['', ...categories]]);
    }
    function get2DArrayFromRawData(exportData) {
        let result;
        const { series } = exportData;
        if (series.bullet) {
            result = makeBulletExportData(exportData);
        }
        else if (series.heatmap) {
            result = makeHeatmapExportData(exportData);
        }
        else if (series.bubble) {
            result = makeBubbleExportData(exportData);
        }
        else if (series.boxPlot) {
            result = makeBoxPlotExportData(exportData);
        }
        else if (series.pie) {
            result = makePieExportData(exportData);
        }
        else if (series.treemap) {
            result = makeTreemapExportData(exportData);
        }
        else {
            result = makeExportData(exportData);
        }
        return result;
    }
    function getTableElementStringForXLS(chartData2DArray) {
        let tableElementString = '<table>';
        chartData2DArray.forEach((row, rowIndex) => {
            const cellTagName = rowIndex === 0 ? 'th' : 'td';
            tableElementString += '<tr>';
            row.forEach((cell, cellIndex) => {
                const cellNumberClass = rowIndex !== 0 || cellIndex === 0 ? ' class="number"' : '';
                const cellString = `<${cellTagName}${cellNumberClass}>${cell}</${cellTagName}>`;
                tableElementString += cellString;
            });
            tableElementString += '</tr>';
        });
        tableElementString += '</table>';
        return tableElementString;
    }
    function makeXLSBodyWithRawData(chartData2DArray) {
        return oneLineTrim `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Ark1</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                </xml>
            <![endif]-->
            <meta name=ProgId content=Excel.Sheet>
            <meta charset=UTF-8>
        </head>
        <body>
            ${getTableElementStringForXLS(chartData2DArray)}
        </body>
        </html>`;
    }
    function makeCSVBodyWithRawData(chartData2DArray, option = {}) {
        const { lineDelimiter = '\u000a', itemDelimiter = ',' } = option;
        const lastRowIndex = chartData2DArray.length - 1;
        let csvText = '';
        chartData2DArray.forEach((row, rowIndex) => {
            const lastCellIndex = row.length - 1;
            row.forEach((cell, cellIndex) => {
                const cellContent = isNumber(cell) ? cell : `"${cell}"`;
                csvText += cellContent;
                if (cellIndex < lastCellIndex) {
                    csvText += itemDelimiter;
                }
            });
            if (rowIndex < lastRowIndex) {
                csvText += lineDelimiter;
            }
        });
        return csvText;
    }
    function execDownload(fileName, extension, content, contentType) {
        const downloadMethod = getDownloadMethod();
        if (!isString(content) || !downloadMethod) {
            return;
        }
        downloadMethod(fileName, extension, content, contentType);
    }
    function downloadSpreadSheet(fileName, extension, data) {
        const chartData2DArray = get2DArrayFromRawData(data);
        const contentType = DATA_URI_HEADERS[extension].replace(/(data:|;base64,|,%EF%BB%BF)/g, '');
        let content = '';
        if (extension === 'csv') {
            content = makeCSVBodyWithRawData(chartData2DArray);
        }
        else {
            content = makeXLSBodyWithRawData(chartData2DArray);
        }
        if (isNeedDataEncoding()) {
            if (extension !== 'csv') {
                // base64 encoding for data URI scheme.
                content = window.btoa(unescape(encodeURIComponent(content)));
            }
            content = DATA_URI_HEADERS[extension] + content;
        }
        execDownload(fileName, extension, content, contentType);
    }

    const EXPORT_MENU_WIDTH = 140;
    const exportExtensions = {
        IMAGES: ['png', 'jpeg'],
        SPREAD_SHEETS: ['xls', 'csv'],
    };
    const BUTTON_RECT_SIZE = 24;
    class ExportMenu extends Component {
        constructor() {
            super(...arguments);
            this.models = { exportMenuButton: [] };
            this.opened = false;
            this.chartWidth = 0;
            this.toggleExportMenu = () => {
                this.opened = !this.opened;
                this.models.exportMenuButton[0].opened = this.opened;
                this.eventBus.emit('needDraw');
                if (this.opened) {
                    this.applyPanelWrapperStyle();
                    this.chartEl.appendChild(this.exportMenuEl);
                }
                else {
                    this.chartEl.removeChild(this.exportMenuEl);
                }
            };
            this.getCanvasExportBtnRemoved = () => {
                const canvas = this.chartEl.getElementsByTagName('canvas')[0];
                const ctx = canvas.getContext('2d');
                const { x, y, height: h, width: w } = this.rect;
                ctx.clearRect(x, y, w, h);
                ctx.fillStyle = this.chartBackgroundColor;
                ctx.fillRect(x, y, w, h);
                return canvas;
            };
            this.onClickExportButton = (ev) => {
                const { id } = ev.target;
                const isImageExtension = exportExtensions.IMAGES.includes(id);
                const isSpreadSheetExtension = exportExtensions.SPREAD_SHEETS.includes(id);
                if (isImageExtension) {
                    const canvas = this.getCanvasExportBtnRemoved();
                    execDownload(this.fileName, id, canvas.toDataURL(`image/${id}`, 1));
                }
                else if (isSpreadSheetExtension) {
                    downloadSpreadSheet(this.fileName, id, this.data);
                }
                if (isImageExtension || isSpreadSheetExtension) {
                    this.toggleExportMenu();
                }
            };
        }
        applyExportButtonPanelStyle() {
            const exportMenuTitle = this.exportMenuEl.querySelector('.toastui-chart-export-menu-title');
            const menuBtnWrapper = this.exportMenuEl.querySelector('.toastui-chart-export-menu-btn-wrapper');
            exportMenuTitle.setAttribute('style', this.makePanelStyle('header'));
            menuBtnWrapper.setAttribute('style', this.makePanelStyle('body'));
        }
        makeExportMenuButton() {
            const el = document.createElement('div');
            el.onclick = this.onClickExportButton;
            el.innerHTML = `
        <div class="toastui-chart-export-menu">
          <p class="toastui-chart-export-menu-title">Export to</p>
          <div class="toastui-chart-export-menu-btn-wrapper">
            <button class="toastui-chart-export-menu-btn" id="xls">xls</button>
            <button class="toastui-chart-export-menu-btn" id="csv">csv</button>
            <button class="toastui-chart-export-menu-btn" id="png">png</button>
            <button class="toastui-chart-export-menu-btn" id="jpeg">jpeg</button>
          </div>
        </div>
      `;
            return el;
        }
        initialize({ chartEl }) {
            this.chartEl = chartEl;
            this.type = 'exportMenu';
            this.name = 'exportMenu';
            this.exportMenuEl = this.makeExportMenuButton();
        }
        onClick({ responders }) {
            if (responders.length) {
                this.toggleExportMenu();
            }
        }
        getFileName(title) {
            var _a, _b;
            return isString(title) ? title : (_b = (_a = title) === null || _a === void 0 ? void 0 : _a.text, (_b !== null && _b !== void 0 ? _b : 'toast-ui-chart'));
        }
        render({ options, layout, chart, series, rawCategories, theme }) {
            var _a, _b;
            this.isShow = isExportMenuVisible(options);
            this.chartWidth = chart.width;
            if (!this.isShow) {
                return;
            }
            this.chartBackgroundColor = theme.chart.backgroundColor;
            this.theme = theme.exportMenu;
            this.data = { series, categories: rawCategories };
            this.fileName = this.getFileName(((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.exportMenu) === null || _b === void 0 ? void 0 : _b.filename) || chart.title);
            this.applyExportButtonPanelStyle();
            this.rect = layout.exportMenu;
            this.models.exportMenuButton = [
                {
                    type: 'exportMenuButton',
                    x: 0,
                    y: 0,
                    opened: this.opened,
                    theme: this.theme.button,
                },
            ];
            this.responders = [
                {
                    type: 'rect',
                    width: BUTTON_RECT_SIZE,
                    height: BUTTON_RECT_SIZE,
                    x: 0,
                    y: 0,
                },
            ];
        }
        applyPanelWrapperStyle() {
            const exportMenu = this.exportMenuEl.querySelector('.toastui-chart-export-menu');
            const x = this.chartWidth - EXPORT_MENU_WIDTH - padding.X;
            const y = padding.Y + BUTTON_RECT_SIZE + 5;
            const { borderRadius, borderWidth, borderColor } = this.theme.panel;
            const style = `
      transform: ${getTranslateString(x, y)};
      border: ${borderWidth}px solid ${borderColor};
      border-radius: ${borderRadius}px;`;
            exportMenu.setAttribute('style', style);
        }
        makePanelStyle(type) {
            const sectionTheme = this.theme.panel[type];
            const direction = type === 'header' ? 'top' : 'bottom';
            const { borderRadius, borderWidth } = this.theme.panel;
            const borderRadiusPx = `${borderRadius - borderWidth}px`;
            return [
                `${getFontStyleString(sectionTheme)}`,
                `border-${direction}-left-radius: ${borderRadiusPx};`,
                `border-${direction}-right-radius: ${borderRadiusPx};`,
                `background-color: ${sectionTheme.backgroundColor};`,
            ].join('');
        }
    }

    function dataLabel(ctx, model) {
        var _a;
        const { x, y, text, textAlign, textBaseline, opacity, callout, theme, radian } = model;
        const { color, textBubble } = theme;
        const font = getFont(theme);
        const textStyle = { textAlign, textBaseline, font, fillStyle: color };
        const textStrokeStyle = getTextStrokeStyle(theme);
        if (callout) {
            const { theme: { lineWidth, lineColor }, } = callout;
            line(ctx, Object.assign(Object.assign({ type: 'line' }, pick(callout, 'x', 'y', 'x2', 'y2')), { strokeStyle: lineColor, lineWidth }));
        }
        if ((_a = textBubble) === null || _a === void 0 ? void 0 : _a.visible) {
            drawBubbleLabel(ctx, model);
            return;
        }
        label(ctx, {
            type: 'label',
            x,
            y,
            text,
            style: [textStyle],
            stroke: [textStrokeStyle],
            opacity,
            radian,
        });
    }
    function drawBubbleLabel(ctx, model) {
        const { text, theme, radian = 0 } = model;
        const { color, textStrokeColor } = theme;
        const font = getFont(theme);
        const bubbleRect = getBubbleRect(model);
        const { x, y, width, height } = bubbleRect;
        bubbleLabel(ctx, {
            type: 'bubbleLabel',
            radian,
            rotationPosition: { x: model.x, y: model.y },
            bubble: bubbleRect,
            label: {
                x: x + width / 2,
                y: y + height / 2,
                text,
                style: [{ font, fillStyle: color, textAlign: 'center', textBaseline: 'middle' }],
                strokeStyle: textStrokeColor,
            },
        });
    }
    function getBubbleArrowPoints(direction, { x, y }, arrowPointTheme) {
        const width = arrowPointTheme.width;
        const height = arrowPointTheme.height;
        let points = [];
        if (direction === 'top') {
            points = [
                { x: x - width / 2, y: y + height },
                { x, y },
                { x: x + width / 2, y: y + height },
            ];
        }
        else if (direction === 'bottom') {
            points = [
                { x: x + width / 2, y: y - height },
                { x, y },
                { x: x - width / 2, y: y - height },
            ];
        }
        else if (direction === 'right') {
            points = [
                { x: x - height, y: y - width / 2 },
                { x, y },
                { x: x - height, y: y + width / 2 },
            ];
        }
        else if (direction === 'left') {
            points = [
                { x: x + height, y: y + width / 2 },
                { x, y },
                { x: x + height, y: y - width / 2 },
            ];
        }
        return points;
    }
    function getBubbleRect(model) {
        const { text, theme, textAlign, textBaseline } = model;
        const font = getFont(theme);
        const { arrow, paddingX, paddingY, borderRadius, borderColor, borderWidth, backgroundColor, shadowBlur, shadowOffsetX, shadowOffsetY, shadowColor, } = theme.textBubble;
        const labelWidth = getTextWidth(text, font);
        const width = labelWidth + paddingX * 2;
        const height = getTextHeight(text, font) + paddingY * 2;
        let { x, y } = model;
        if (textAlign === 'center') {
            x -= width / 2;
        }
        else if (includes(['right', 'end'], textAlign)) {
            x -= width;
        }
        if (textBaseline === 'middle') {
            y -= height / 2;
        }
        else if (textBaseline === 'bottom') {
            y -= height;
        }
        const rect = { x, y, width, height };
        return Object.assign(Object.assign(Object.assign({}, rect), { radius: borderRadius, lineWidth: borderWidth, fill: backgroundColor, strokeStyle: borderColor, style: [
                {
                    shadowBlur,
                    shadowOffsetX,
                    shadowOffsetY,
                    shadowColor,
                },
            ] }), getArrowInfo(rect, textAlign, textBaseline, arrow));
    }
    function getArrowInfo(rect, textAlign, textBaseline, theme) {
        var _a, _b;
        if (!((_a = theme) === null || _a === void 0 ? void 0 : _a.visible)) {
            return null;
        }
        const arrowHeight = theme.height;
        const { width, height } = rect;
        const direction = (_b = theme.direction, (_b !== null && _b !== void 0 ? _b : getArrowDirection(textAlign, textBaseline)));
        let { x: boxX, y: boxY } = rect;
        let { x: pointX, y: pointY } = rect;
        if (direction === 'top') {
            boxY += arrowHeight;
        }
        else if (direction === 'bottom') {
            boxY -= arrowHeight;
            pointY += height;
        }
        else if (direction === 'right') {
            boxX -= arrowHeight;
            pointX += width;
        }
        else if (direction === 'left') {
            boxX += arrowHeight;
        }
        if (textAlign === 'center') {
            pointX = rect.x + width / 2;
        }
        else if (textBaseline === 'middle') {
            pointY = rect.y + height / 2;
        }
        return {
            direction,
            points: getBubbleArrowPoints(direction, { x: pointX, y: pointY }, theme),
            x: boxX,
            y: boxY,
        };
    }
    function getArrowDirection(textAlign, textBaseline) {
        let direction = 'top';
        if (textAlign === 'center' && textBaseline === 'top') {
            direction = 'top';
        }
        else if (textAlign === 'center' && textBaseline === 'bottom') {
            direction = 'bottom';
        }
        else if (textBaseline === 'middle' && textAlign === 'right') {
            direction = 'right';
        }
        else if (textBaseline === 'middle' && textAlign === 'left') {
            direction = 'left';
        }
        return direction;
    }
    function getTextStrokeStyle(theme) {
        const { textStrokeColor } = theme;
        const textStrokeStyle = pick(theme, 'lineWidth', 'shadowColor', 'shadowBlur');
        if (textStrokeColor) {
            textStrokeStyle.strokeStyle = textStrokeColor;
        }
        return textStrokeStyle;
    }

    var dataLabelBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        dataLabel: dataLabel,
        drawBubbleLabel: drawBubbleLabel,
        getBubbleArrowPoints: getBubbleArrowPoints
    });

    const SPECTRUM_LEGEND_LABEL_HEIGHT = 12;
    const spectrumLegendBar = {
        HEIGHT: 6,
        PADDING: 5,
    };
    const spectrumLegendTooltip = {
        HEIGHT: 28,
        POINT_WIDTH: 8,
        POINT_HEIGHT: 6,
        PADDING: 6,
    };

    const padding = { X: 10, Y: 15 };
    const X_AXIS_HEIGHT = 20;
    const Y_AXIS_MIN_WIDTH = 40;
    function isVerticalAlign(align) {
        return align === 'top' || align === 'bottom';
    }
    function getValidRectSize(size, width, height) {
        var _a, _b, _c, _d;
        return {
            height: (_b = (_a = size) === null || _a === void 0 ? void 0 : _a.height, (_b !== null && _b !== void 0 ? _b : height)),
            width: (_d = (_c = size) === null || _c === void 0 ? void 0 : _c.width, (_d !== null && _d !== void 0 ? _d : width)),
        };
    }
    function getDefaultXAxisHeight(size) {
        var _a;
        return ((_a = size.xAxis) === null || _a === void 0 ? void 0 : _a.height) && !size.yAxis ? size.xAxis.height : X_AXIS_HEIGHT;
    }
    function getDefaultYAxisXPoint(yAxisRectParam) {
        const { yAxisTitle, isRightSide, visibleSecondaryYAxis } = yAxisRectParam;
        const yAxisWidth = getDefaultYAxisWidth(yAxisRectParam);
        return isRightSide && visibleSecondaryYAxis
            ? Math.max(yAxisTitle.x + yAxisTitle.width - yAxisWidth, 0)
            : yAxisTitle.x;
    }
    function getYAxisXPoint(yAxisRectParam) {
        const { chartSize, legend, circleLegend, hasCenterYAxis, maxLabelWidth } = yAxisRectParam;
        const { width } = chartSize;
        const { align } = legend;
        let yAxisWidth = getDefaultYAxisWidth(yAxisRectParam);
        let x = getDefaultYAxisXPoint(yAxisRectParam);
        if (hasCenterYAxis) {
            yAxisWidth = maxLabelWidth + (TICK_SIZE + padding.X) * 2;
            x = (width - legend.width - yAxisWidth + padding.X * 2) / 2;
        }
        if (legend.visible && align === 'left') {
            x = getDefaultYAxisXPoint(yAxisRectParam);
        }
        if (circleLegend.visible && align === 'left') {
            x = Math.max(circleLegend.width + padding.X, x);
        }
        return x;
    }
    function getYAxisYPoint({ yAxisTitle }) {
        return yAxisTitle.y + yAxisTitle.height;
    }
    function getDefaultYAxisWidth({ maxLabelWidth, size, isRightSide }) {
        var _a, _b, _c;
        return _c = (_b = (_a = size) === null || _a === void 0 ? void 0 : _a[isRightSide ? 'secondaryYAxis' : 'yAxis']) === null || _b === void 0 ? void 0 : _b.width, (_c !== null && _c !== void 0 ? _c : maxLabelWidth);
    }
    function getYAxisWidth(yAxisRectParam) {
        const { hasCenterYAxis, hasXYAxis, maxLabelWidth, visibleSecondaryYAxis = false, isRightSide = false, } = yAxisRectParam;
        let yAxisWidth = getDefaultYAxisWidth(yAxisRectParam);
        if (hasCenterYAxis && !isRightSide) {
            yAxisWidth = maxLabelWidth + (TICK_SIZE + padding.X) * 2;
        }
        else if (!hasXYAxis || (isRightSide && !visibleSecondaryYAxis)) {
            yAxisWidth = 0;
        }
        return yAxisWidth;
    }
    function getYAxisHeight({ chartSize, legend, yAxisTitle, hasXYAxis, size, xAxisTitleHeight, }) {
        var _a, _b, _c, _d;
        const { height } = chartSize;
        const { align, height: legendHeight } = legend;
        const xAxisHeight = getDefaultXAxisHeight(size);
        const y = yAxisTitle.y + yAxisTitle.height;
        let yAxisHeight = height - y - xAxisHeight - xAxisTitleHeight;
        if (!hasXYAxis) {
            yAxisHeight = height - y;
        }
        if (legend.visible) {
            const topArea = Math.max(y, legendHeight);
            if (align === 'top') {
                yAxisHeight = height - topArea - (hasXYAxis ? X_AXIS_HEIGHT + xAxisTitleHeight : 0);
            }
            else if (align === 'bottom') {
                yAxisHeight = height - y - X_AXIS_HEIGHT - xAxisTitleHeight - legendHeight;
            }
        }
        if (!((_b = (_a = size) === null || _a === void 0 ? void 0 : _a.yAxis) === null || _b === void 0 ? void 0 : _b.height) && ((_d = (_c = size) === null || _c === void 0 ? void 0 : _c.plot) === null || _d === void 0 ? void 0 : _d.height)) {
            yAxisHeight = size.plot.height;
        }
        return yAxisHeight;
    }
    function getYAxisRect(yAxisRectParam) {
        var _a, _b;
        const { size, isRightSide = false } = yAxisRectParam;
        const x = getYAxisXPoint(yAxisRectParam);
        const y = getYAxisYPoint(yAxisRectParam);
        const yAxisWidth = getYAxisWidth(yAxisRectParam);
        const yAxisHeight = getYAxisHeight(yAxisRectParam);
        return Object.assign({ x,
            y }, getValidRectSize(isRightSide ? (_a = size) === null || _a === void 0 ? void 0 : _a.secondaryYAxis : (_b = size) === null || _b === void 0 ? void 0 : _b.yAxis, yAxisWidth, yAxisHeight));
    }
    function getXAxisWidth({ chartSize, yAxis, hasCenterYAxis, legend, circleLegend, secondaryYAxis, xAxisData, }) {
        var _a;
        const { width } = chartSize;
        const { align, width: legendWidth } = legend;
        const legendVerticalAlign = isVerticalAlign(align);
        let xAxisWidth;
        if (legendVerticalAlign) {
            xAxisWidth = width - (yAxis.x + yAxis.width + padding.X);
            if (circleLegend.visible) {
                xAxisWidth -= circleLegend.width;
            }
        }
        else {
            xAxisWidth =
                width - (yAxis.width + Math.max(legendWidth, circleLegend.visible ? circleLegend.width : 0));
        }
        if (hasCenterYAxis) {
            xAxisWidth = width - (legendVerticalAlign ? 0 : legendWidth) - padding.X * 2;
        }
        if (secondaryYAxis.width) {
            xAxisWidth -= secondaryYAxis.width;
        }
        if ((_a = xAxisData) === null || _a === void 0 ? void 0 : _a.maxLabelWidth) {
            // subtract half of the maximum label length to secure margin size
            xAxisWidth -= xAxisData.maxLabelWidth * 0.5;
        }
        return xAxisWidth;
    }
    function getXAxisHeight(xAxisData, hasXYAxis = false) {
        var _a, _b;
        if (!hasXYAxis) {
            return 0;
        }
        return _b = (_a = xAxisData) === null || _a === void 0 ? void 0 : _a.maxHeight, (_b !== null && _b !== void 0 ? _b : X_AXIS_HEIGHT);
    }
    function getXAxisRect(xAxisRectParam) {
        var _a;
        const { hasXYAxis, hasCenterYAxis, yAxis, size, xAxisData } = xAxisRectParam;
        const x = hasCenterYAxis ? padding.X * 2 : yAxis.x + yAxis.width;
        const y = yAxis.y + yAxis.height;
        const xAxisWidth = getXAxisWidth(xAxisRectParam);
        const xAxisHeight = getXAxisHeight(xAxisData, hasXYAxis);
        return Object.assign({ x,
            y }, getValidRectSize((_a = size) === null || _a === void 0 ? void 0 : _a.xAxis, xAxisWidth, xAxisHeight));
    }
    function getLegendRect(legendRectParams) {
        const { legend, xAxis, yAxis, chartSize, title, hasXYAxis, secondaryYAxis, xAxisTitleHeight, } = legendRectParams;
        if (!legend.visible) {
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            };
        }
        const { align, width: legendWidth, height: legendHeight } = legend;
        const { width } = chartSize;
        const verticalAlign = isVerticalAlign(align);
        let x = xAxis.x + xAxis.width + secondaryYAxis.width + padding.X;
        let y = Math.max(yAxis.y, BUTTON_RECT_SIZE);
        if (verticalAlign) {
            x = (width - legendWidth) / 2;
            if (align === 'top') {
                y = title.y + title.height;
            }
            else {
                y = yAxis.y + yAxis.height + (hasXYAxis ? xAxis.height + xAxisTitleHeight : padding.Y);
            }
        }
        else if (align === 'left') {
            x = padding.X;
        }
        return { width: legendWidth, height: legendHeight, x, y };
    }
    function getCircleLegendRect(xAxis, yAxis, align, width) {
        return {
            width,
            height: yAxis.height,
            x: align === 'left' ? padding.X : xAxis.x + xAxis.width + padding.X,
            y: yAxis.y,
        };
    }
    function getPlotRect(xAxis, yAxis, size) {
        return Object.assign({ x: xAxis.x, y: yAxis.y }, getValidRectSize(size, xAxis.width, yAxis.height));
    }
    function getTitleRect(chartSize, exportMenu, visible, titleHeight) {
        const point = { x: padding.X, y: padding.Y };
        const marginBottom = 5;
        const width = visible ? chartSize.width - exportMenu.width : 0;
        const height = visible
            ? Math.max(titleHeight + marginBottom, exportMenu.height)
            : exportMenu.height;
        return Object.assign({ width, height }, point);
    }
    function getTopLegendAreaHeight(useSpectrumLegend, legendHeight) {
        return useSpectrumLegend
            ? SPECTRUM_LEGEND_LABEL_HEIGHT +
                spectrumLegendBar.PADDING * 2 +
                spectrumLegendTooltip.POINT_HEIGHT +
                spectrumLegendTooltip.HEIGHT +
                padding.Y
            : legendHeight + padding.Y;
    }
    function getYAxisTitleRect({ chartSize, visible, title, legend: { align: legendAlign, width: legendWidth, height: legendHeight, visible: legendVisible, useSpectrumLegend, }, hasCenterYAxis, visibleSecondaryYAxis, isRightSide = false, yAxisTitleHeight, }) {
        const marginBottom = 5;
        const height = visible ? yAxisTitleHeight + marginBottom : 0;
        const verticalLegendAlign = isVerticalAlign(legendAlign);
        const width = (chartSize.width - (verticalLegendAlign ? padding.X * 2 : legendWidth)) /
            (visibleSecondaryYAxis ? 2 : 1);
        const point = {
            x: isRightSide ? title.x + width : title.x,
            y: title.y + title.height,
        };
        if (legendVisible) {
            if (legendAlign === 'left') {
                point.x += legendWidth;
            }
            else if (legendAlign === 'top') {
                point.y += getTopLegendAreaHeight(useSpectrumLegend, legendHeight);
            }
        }
        if (hasCenterYAxis) {
            point.x = (width + padding.X * 2) / 2;
        }
        return Object.assign({ height, width }, point);
    }
    function getXAxisTitleRect(visible, xAxis, xAxisTitleHeight) {
        const point = { x: xAxis.x, y: xAxis.y + xAxis.height };
        const height = visible ? xAxisTitleHeight : 0;
        const width = visible ? xAxis.width : 0;
        return Object.assign({ height, width }, point);
    }
    function getExportMenuRect(chartSize, visible) {
        const marginY = 5;
        const x = visible ? padding.X + chartSize.width - BUTTON_RECT_SIZE : padding.X + chartSize.width;
        const y = padding.Y;
        const height = visible ? BUTTON_RECT_SIZE + marginY : 0;
        const width = visible ? BUTTON_RECT_SIZE : 0;
        return { x, y, height, width };
    }
    function getResetButtonRect(exportMenu, useResetButton) {
        const marginY = 5;
        const x = useResetButton ? exportMenu.x - BUTTON_RECT_SIZE - padding.X : 0;
        const y = useResetButton ? exportMenu.y : 0;
        const height = useResetButton ? BUTTON_RECT_SIZE + marginY : 0;
        const width = useResetButton ? BUTTON_RECT_SIZE : 0;
        return { x, y, height, width };
    }
    function isUsingResetButton(options) {
        var _a;
        return !!((_a = options.series) === null || _a === void 0 ? void 0 : _a.zoomable);
    }
    function isExportMenuVisible(options) {
        var _a;
        const visible = (_a = options.exportMenu) === null || _a === void 0 ? void 0 : _a.visible;
        return isUndefined(visible) ? true : visible;
    }
    function getYAxisMaxLabelWidth(maxLabelLength) {
        return maxLabelLength ? maxLabelLength + padding.X : Y_AXIS_MIN_WIDTH;
    }
    function pickOptionSize(option) {
        if (!option || (isUndefined(option.width) && isUndefined(option.height))) {
            return null;
        }
        return pick(option, 'width', 'height');
    }
    function validOffsetValue(axis, plot, sizeKey) {
        const axisSize = axis[sizeKey];
        const plotSize = plot[sizeKey];
        if (isNumber(axisSize) && isNumber(plotSize)) {
            return Math.max(axisSize, plotSize);
        }
    }
    function getOptionSize(options) {
        const xAxis = pickOptionSize(options.xAxis);
        const yAxisOptions = getYAxisOption(options);
        const yAxis = pickOptionSize(yAxisOptions.yAxis);
        const secondaryYAxis = pickOptionSize(yAxisOptions.secondaryYAxis);
        const plot = pickOptionSize(options.plot);
        if (plot) {
            /*
            If both the width of the x-axis and the width of the plot are entered,
            set the maximum value.
          */
            if (xAxis) {
                xAxis.width = plot.width = validOffsetValue(xAxis, plot, 'width');
            }
            /*
            If both the height of the y-axis and the height of the plot are entered,
            set the maximum value.
          */
            if (yAxis) {
                yAxis.height = plot.height = validOffsetValue(yAxis, plot, 'height');
            }
            if (secondaryYAxis) {
                secondaryYAxis.height = plot.height = validOffsetValue(secondaryYAxis, plot, 'height');
            }
        }
        return {
            xAxis,
            yAxis,
            plot,
            secondaryYAxis,
        };
    }
    function getAxisTitleHeight(axisTheme, offsetY = 0) {
        const fontSize = Array.isArray(axisTheme)
            ? Math.max(axisTheme[0].title.fontSize, axisTheme[1].title.fontSize)
            : axisTheme.title.fontSize;
        return fontSize + offsetY;
    }
    function adjustAxisSize({ width, height }, layout, legendState) {
        if (width < 0 || height < 0) {
            return;
        }
        const { title, yAxisTitle, yAxis, xAxis, xAxisTitle, legend, secondaryYAxis } = layout;
        const { align } = legendState;
        const hasVerticalLegend = isVerticalAlign(align);
        const legendHeight = hasVerticalLegend ? legend.height : 0;
        const diffHeight = xAxis.height +
            xAxisTitle.height +
            yAxis.height +
            yAxisTitle.height +
            title.height +
            legendHeight -
            height;
        if (diffHeight > 0) {
            yAxis.height -= diffHeight;
            xAxis.y -= diffHeight;
            xAxisTitle.y -= diffHeight;
            if (hasVerticalLegend) {
                legend.y -= diffHeight;
            }
        }
        secondaryYAxis.x = xAxis.x + xAxis.width;
        secondaryYAxis.height = yAxis.height;
    }
    function getCircularAxisTitleRect(plot, axisTheme, circularAxis) {
        var _a, _b;
        if (!circularAxis) {
            return Object.assign({}, plot);
        }
        const { x, y } = plot;
        const { centerX, centerY, axisSize, title, radius: { outer }, } = circularAxis;
        const offsetY = (_b = (_a = title) === null || _a === void 0 ? void 0 : _a.offsetY, (_b !== null && _b !== void 0 ? _b : 0));
        return {
            x: centerX + x - axisSize / 2,
            y: centerY + y - outer / 2,
            width: axisSize,
            height: axisTheme.title.fontSize + offsetY,
        };
    }
    function hasXYAxes(series) {
        return !(series.pie || series.radar || series.treemap || series.radialBar || series.gauge);
    }
    function getYAxisOptions(options, hasXYAxis) {
        return hasXYAxis
            ? getYAxisOption(options)
            : {
                yAxis: null,
                secondaryYAxis: null,
            };
    }
    const layout = {
        name: 'layout',
        state: () => ({
            layout: {},
        }),
        action: {
            setLayout({ state }) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                const { legend: legendState, theme, circleLegend: circleLegendState, series, options, chart, axes, radialAxes, } = state;
                const { width, height } = chart;
                const chartSize = {
                    height: height - padding.Y * 2,
                    width: width - padding.X * 2,
                };
                const hasCenterYAxis = series.bar ? isCenterYAxis(options) : false;
                const hasXYAxis = hasXYAxes(series);
                const optionSize = getOptionSize(options);
                const { yAxis: yAxisOption, secondaryYAxis: secondaryYAxisOption } = getYAxisOptions(options, hasXYAxis);
                const visibleSecondaryYAxis = !!secondaryYAxisOption;
                const titleHeight = theme.title.fontSize;
                const yAxisTitleHeight = (_d = getAxisTitleHeight(theme.yAxis, (_c = (_b = (_a = axes) === null || _a === void 0 ? void 0 : _a.yAxis) === null || _b === void 0 ? void 0 : _b.title) === null || _c === void 0 ? void 0 : _c.offsetY), (_d !== null && _d !== void 0 ? _d : 0));
                const xAxisTitleHeight = (_h = getAxisTitleHeight(theme.xAxis, (_g = (_f = (_e = axes) === null || _e === void 0 ? void 0 : _e.xAxis) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g.offsetY), (_h !== null && _h !== void 0 ? _h : 0));
                // Don't change the order!
                // exportMenu -> resetButton -> title -> yAxis.title -> yAxis -> secondaryYAxisTitle -> secondaryYAxis -> xAxis -> xAxis.title -> legend -> circleLegend -> plot -> circularAxis.title
                const exportMenu = getExportMenuRect(chartSize, isExportMenuVisible(options));
                const resetButton = getResetButtonRect(exportMenu, isUsingResetButton(options));
                const btnAreaRect = exportMenu.height ? exportMenu : resetButton;
                const title = getTitleRect(chartSize, btnAreaRect, !!((_j = options.chart) === null || _j === void 0 ? void 0 : _j.title), titleHeight);
                const yAxisTitleVisible = !!((_k = yAxisOption) === null || _k === void 0 ? void 0 : _k.title) || !!((_l = secondaryYAxisOption) === null || _l === void 0 ? void 0 : _l.title);
                const yAxisTitle = getYAxisTitleRect({
                    chartSize,
                    visible: yAxisTitleVisible,
                    title,
                    legend: legendState,
                    hasCenterYAxis,
                    visibleSecondaryYAxis,
                    yAxisTitleHeight,
                });
                const yAxis = getYAxisRect({
                    chartSize,
                    legend: legendState,
                    circleLegend: circleLegendState,
                    yAxisTitle,
                    hasCenterYAxis,
                    hasXYAxis,
                    maxLabelWidth: getYAxisMaxLabelWidth((_m = axes) === null || _m === void 0 ? void 0 : _m.yAxis.maxLabelWidth),
                    size: optionSize,
                    xAxisTitleHeight,
                });
                const secondaryYAxisTitle = getYAxisTitleRect({
                    chartSize,
                    visible: yAxisTitleVisible,
                    title,
                    legend: legendState,
                    hasCenterYAxis,
                    isRightSide: true,
                    visibleSecondaryYAxis,
                    yAxisTitleHeight,
                });
                const secondaryYAxis = getYAxisRect({
                    chartSize,
                    legend: legendState,
                    circleLegend: circleLegendState,
                    yAxisTitle: secondaryYAxisTitle,
                    hasCenterYAxis,
                    hasXYAxis,
                    maxLabelWidth: getYAxisMaxLabelWidth((_p = (_o = axes) === null || _o === void 0 ? void 0 : _o.secondaryYAxis) === null || _p === void 0 ? void 0 : _p.maxLabelWidth),
                    size: optionSize,
                    isRightSide: true,
                    visibleSecondaryYAxis,
                    xAxisTitleHeight,
                });
                const xAxis = getXAxisRect({
                    chartSize,
                    yAxis,
                    secondaryYAxis,
                    legend: legendState,
                    circleLegend: circleLegendState,
                    hasCenterYAxis,
                    hasXYAxis,
                    size: optionSize,
                    xAxisData: (_q = axes) === null || _q === void 0 ? void 0 : _q.xAxis,
                });
                const xAxisTitle = getXAxisTitleRect(!!((_r = options.xAxis) === null || _r === void 0 ? void 0 : _r.title), xAxis, xAxisTitleHeight);
                const legend = getLegendRect({
                    chartSize,
                    xAxis,
                    yAxis,
                    secondaryYAxis,
                    title,
                    legend: legendState,
                    hasXYAxis,
                    xAxisTitleHeight,
                });
                adjustAxisSize(chartSize, { title, yAxisTitle, yAxis, xAxis, xAxisTitle, legend, secondaryYAxis }, legendState);
                const circleLegend = getCircleLegendRect(xAxis, yAxis, legendState.align, circleLegendState.width);
                const plot = getPlotRect(xAxis, yAxis, optionSize.plot);
                const circularAxisTitle = getCircularAxisTitleRect(plot, theme.circularAxis, (_s = radialAxes) === null || _s === void 0 ? void 0 : _s.circularAxis);
                extend(state.layout, {
                    chart: { x: 0, y: 0, width, height },
                    title,
                    plot,
                    legend,
                    circleLegend,
                    xAxis,
                    xAxisTitle,
                    yAxis,
                    yAxisTitle,
                    exportMenu,
                    resetButton,
                    secondaryYAxisTitle,
                    secondaryYAxis,
                    circularAxisTitle,
                });
            },
        },
        observe: {
            updateLayoutObserve() {
                this.dispatch('setLayout');
            },
        },
    };
    var layout$1 = layout;

    function isRangeValue(value) {
        return Array.isArray(value) && value.length === 2;
    }
    function isZooming(categories, zoomRange) {
        return !!(zoomRange && (zoomRange[0] !== 0 || zoomRange[1] !== categories.length - 1));
    }
    function getDataInRange(data, range) {
        if (!range) {
            return data;
        }
        return data.slice(range[0], range[1] + 1);
    }

    function makeRawCategories(series, categories) {
        if (categories) {
            return categories;
        }
        const firstValues = new Set();
        Object.keys(series).forEach((key) => {
            var _a;
            if (key === 'pie' || key === 'gauge') {
                return;
            }
            (_a = series[key].data, (_a !== null && _a !== void 0 ? _a : series[key])).forEach(({ data, name, visible }) => {
                if (Array.isArray(data)) {
                    data.forEach((datum) => {
                        if (!isNull(datum)) {
                            const rawXValue = getCoordinateXValue(datum);
                            firstValues.add(isNumber(rawXValue) ? rawXValue : rawXValue.toString());
                        }
                    });
                }
                else if ((key === 'bullet' && isUndefined(visible)) || visible) {
                    firstValues.add(name);
                }
            });
        });
        return Array.from(firstValues)
            .sort(sortCategories)
            .map((category) => String(category));
    }
    const category = {
        name: 'category',
        state: ({ categories, series }) => ({
            categories: makeRawCategories(series, categories),
        }),
        action: {
            setCategory({ state, computed }) {
                const { viewRange } = computed;
                let categories = state.rawCategories;
                if (viewRange) {
                    if (Array.isArray(categories)) {
                        categories = getDataInRange(categories, viewRange);
                    }
                    else {
                        categories = Object.assign(Object.assign({}, categories), { x: getDataInRange(categories.x, viewRange) });
                    }
                }
                state.categories = categories;
                this.notify(state, 'categories');
            },
            initCategory({ initStoreState, state }) {
                const { zoomRange } = state;
                let categories = makeRawCategories(initStoreState.series);
                if (zoomRange && Array.isArray(categories)) {
                    categories = getDataInRange(categories, zoomRange);
                }
                state.categories = categories;
                this.notify(state, 'categories');
            },
            removeCategoryByName({ state }, name) {
                const index = state.categories.findIndex((seriesName) => seriesName === name);
                state.categories.splice(index, 1);
                this.notify(state, 'axes');
            },
        },
        observe: {
            updateCategory() {
                this.dispatch('setCategory');
            },
        },
    };
    var category$1 = category;

    function initRange(series, categories) {
        let rawCategoriesLength;
        if (categories) {
            rawCategoriesLength = Array.isArray(categories) ? categories.length : categories.x.length;
        }
        else {
            rawCategoriesLength = Object.keys(makeRawCategories(series, categories)).length;
        }
        return [0, rawCategoriesLength - 1];
    }
    function initZoomRange(series, options, categories) {
        var _a;
        if (!(series.line || series.area) || !((_a = options.series) === null || _a === void 0 ? void 0 : _a.zoomable)) {
            return;
        }
        return initRange(series, categories);
    }
    function initShiftRange(series, options, categories) {
        var _a;
        if (!(series.line || series.area || series.column || series.heatmap) ||
            !((_a = options.series) === null || _a === void 0 ? void 0 : _a.shift)) {
            return;
        }
        return initRange(series, categories);
    }
    function getCoordinateDataRange(data, rawCategories, zoomRange) {
        const [zoomStart, zoomEnd] = zoomRange;
        let start, end;
        range(zoomStart, zoomEnd + 1).forEach((i) => {
            const idx = data.findIndex((datum) => getCoordinateXValue(datum).toString() === rawCategories[i]);
            if (idx !== -1) {
                if (isUndefined(start)) {
                    start = idx;
                }
                if (!isUndefined(start)) {
                    end = Math.max(idx, (end !== null && end !== void 0 ? end : 0));
                }
            }
        });
        return [start, end];
    }
    function getSeriesColors(colors, colorIndex, size, isColorByCategories) {
        return isColorByCategories ? colors.slice(0, size + 1) : colors[colorIndex % colors.length];
    }
    function getSeriesDataInRange(data, rawCategories, chartType, zoomRange) {
        if (!zoomRange) {
            return data;
        }
        let [startIdx, endIdx] = zoomRange;
        const firstValidValue = getFirstValidValue(data);
        const isCoordinateChart = chartType !== 'area' && !isUndefined(firstValidValue) && !isNumber(firstValidValue);
        if (isCoordinateChart) {
            [startIdx, endIdx] = getCoordinateDataRange(data, rawCategories, zoomRange);
        }
        else {
            startIdx = startIdx > 1 ? startIdx - 1 : startIdx;
            endIdx = endIdx < rawCategories.length - 1 ? endIdx + 1 : endIdx;
        }
        return data.slice(startIdx, endIdx + 1);
    }
    function isCoordinateTypeSeries(series, chartType) {
        return (isCoordinateSeries(series) &&
            (isUndefined(chartType) || chartType === 'line' || chartType === 'scatter'));
    }
    function isSeriesAlreadyExist(series, seriesName, data) {
        return series[seriesName].some(({ label }) => label === data.name);
    }
    function isTreemapSeriesAlreadyExist(series, data) {
        return series.treemap.some(({ label }) => label === data.label);
    }
    function isHeatmapSeriesAlreadyExist(categories, category) {
        return includes(categories.y, category);
    }
    function initDisabledSeries(series) {
        const nestedPieChart = hasNestedPieSeries(series);
        const disabledSeries = [];
        if (nestedPieChart) {
            series.pie.forEach(({ data }) => {
                data.forEach((datum) => {
                    if (isBoolean(datum.visible) && !datum.visible) {
                        disabledSeries.push(datum.name);
                    }
                });
            });
        }
        else {
            Object.keys(series).forEach((type) => {
                series[type].forEach(({ name, visible }) => {
                    if (isBoolean(visible) && !visible) {
                        disabledSeries.push(name);
                    }
                });
            });
        }
        return disabledSeries;
    }
    const seriesData = {
        name: 'seriesData',
        state: ({ series, categories, options }) => ({
            rawCategories: makeRawCategories(series, categories),
            series: Object.assign({}, series),
            zoomRange: initZoomRange(series, options, categories),
            shiftRange: initShiftRange(series, options, categories),
            disabledSeries: initDisabledSeries(series),
        }),
        action: {
            setSeriesData({ state, initStoreState }) {
                const rawSeries = deepCopy(initStoreState.series);
                const { disabledSeries, theme, zoomRange, rawCategories } = state;
                const newSeriesData = {};
                let colorIndex = 0;
                Object.keys(rawSeries).forEach((seriesName) => {
                    var _a, _b, _c;
                    const { colors, iconTypes } = theme.series[seriesName];
                    let originSeriesData = rawSeries[seriesName].map((series) => {
                        const isColorByCategories = !!series.colorByCategories;
                        const size = isColorByCategories ? rawCategories.length : 1;
                        const color = colors
                            ? getSeriesColors(colors, colorIndex, size, isColorByCategories)
                            : '';
                        colorIndex += size;
                        return Object.assign(Object.assign({}, series), { rawData: series.data, data: getSeriesDataInRange(series.data, rawCategories, seriesName, zoomRange), color });
                    });
                    if (seriesName === 'scatter') {
                        originSeriesData = originSeriesData.map((series, idx) => (Object.assign(Object.assign({}, series), { iconType: iconTypes ? iconTypes[idx] : 'circle' })));
                    }
                    const seriesCount = originSeriesData.length;
                    const seriesGroupCount = (_c = (_b = (_a = originSeriesData[0]) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length, (_c !== null && _c !== void 0 ? _c : 0));
                    const data = originSeriesData.filter(({ name }) => !disabledSeries.includes(name));
                    newSeriesData[seriesName] = {
                        seriesCount,
                        seriesGroupCount,
                        data,
                        colors,
                    };
                });
                extend(state.series, newSeriesData);
            },
            disableSeries({ state }, name) {
                state.disabledSeries.push(name);
                this.notify(state, 'disabledSeries');
                if (state.series.bullet) {
                    this.dispatch('removeCategoryByName', name);
                }
            },
            enableSeries({ state }, name) {
                const index = state.disabledSeries.findIndex((disabled) => disabled === name);
                state.disabledSeries.splice(index, 1);
                this.notify(state, 'disabledSeries');
                if (state.series.bullet) {
                    state.categories = state.series.bullet.data.map(({ name: seriesName }) => seriesName);
                    this.notify(state, 'axes');
                }
            },
            zoom({ state }, rangeCategories) {
                const rawCategories = state.rawCategories;
                state.zoomRange = rangeCategories.map((rangeCategory) => rawCategories.findIndex((category) => category === rangeCategory));
                this.notify(state, 'zoomRange');
            },
            resetZoom({ state, initStoreState }) {
                const { series, options } = initStoreState;
                const rawCategories = state.rawCategories;
                state.zoomRange = initZoomRange(series, options, rawCategories);
                this.notify(state, 'zoomRange');
            },
            addData({ state, initStoreState }, { data, category, chartType }) {
                const { series } = initStoreState;
                const coordinateChart = isCoordinateTypeSeries(state.series, chartType);
                let { categories } = initStoreState;
                categories = series.heatmap ? categories.x : categories;
                if (category && Array.isArray(categories)) {
                    const isExist = categories.some((c) => c === category);
                    if (!isExist) {
                        categories.push(category);
                        if (Array.isArray(state.shiftRange)) {
                            const [start, end] = state.shiftRange;
                            state.shiftRange = [start + 1, end + 1];
                        }
                    }
                }
                if (chartType) {
                    series[chartType].forEach((datum, idx) => {
                        datum.data.push(data[idx]);
                    });
                }
                else {
                    const [seriesName] = Object.keys(initStoreState.series);
                    series[seriesName].forEach((datum, idx) => {
                        datum.data.push(data[idx]);
                    });
                }
                this.notify(state, 'series');
                this.notify(state, 'rawCategories');
                if (Array.isArray(state.zoomRange)) {
                    this.dispatch('resetZoom');
                }
                if (coordinateChart) {
                    this.dispatch('initCategory');
                }
            },
            addSeries({ state, initStoreState }, { data, chartType, category, }) {
                const { series, categories } = initStoreState;
                const coordinateChart = isCoordinateTypeSeries(state.series, chartType);
                const seriesName = chartType || Object.keys(series)[0];
                const isExist = isSeriesAlreadyExist(series, seriesName, data);
                if (!isExist) {
                    series[seriesName].push(data);
                    if (Array.isArray(categories) && category) {
                        categories.push(category);
                    }
                }
                this.dispatch('initThemeState');
                this.dispatch('initLegendState');
                this.notify(state, 'series');
                if (coordinateChart || seriesName === 'bullet') {
                    this.dispatch('initCategory');
                }
            },
            addHeatmapSeries({ state, initStoreState }, { data, category }) {
                const { series, categories } = initStoreState;
                const isExist = isHeatmapSeriesAlreadyExist(categories, category);
                if (!isExist) {
                    series.heatmap.push({ data, yCategory: category });
                }
                if (!isExist && category) {
                    categories.y.push(category);
                    this.notify(state, 'rawCategories');
                }
                this.notify(state, 'series');
                this.dispatch('initThemeState');
                this.dispatch('initLegendState');
            },
            addTreemapSeries({ state, initStoreState }, { data }) {
                const { series } = initStoreState;
                const isExist = isTreemapSeriesAlreadyExist(series, data);
                if (!isExist) {
                    series.treemap.push(data);
                }
                this.notify(state, 'series');
                this.notify(state, 'treemapSeries');
                this.dispatch('initThemeState');
                this.dispatch('initLegendState');
            },
            setData({ state, initStoreState }, { series, categories }) {
                initStoreState.series = series;
                const isNestedPieChart = hasNestedPieSeries(series);
                if (!isNestedPieChart) {
                    state.rawCategories = makeRawCategories(series, categories);
                }
                this.dispatch('initThemeState');
                this.dispatch('initLegendState');
            },
            addOutlier({ state, initStoreState }, { seriesIndex, outliers }) {
                var _a;
                const { series } = initStoreState;
                const seriesRawData = series.boxPlot[seriesIndex];
                if (!seriesRawData) {
                    throw new Error(message.SERIES_INDEX_ERROR);
                }
                seriesRawData.outliers = [...(_a = seriesRawData.outliers, (_a !== null && _a !== void 0 ? _a : [])), ...outliers];
                this.notify(state, 'series');
            },
        },
        observe: {
            updateSeriesData() {
                this.dispatch('setSeriesData');
            },
        },
        computed: {
            isLineTypeSeriesZooming: ({ zoomRange, rawCategories }) => {
                return isZooming(rawCategories, zoomRange);
            },
            viewRange: ({ zoomRange, shiftRange }) => {
                return zoomRange || shiftRange;
            },
        },
    };
    var seriesData$1 = seriesData;

    function polygon(ctx, polygonModel) {
        const { color: strokeStyle, points, lineWidth, fillColor, dashSegments = [] } = polygonModel;
        if (!points.length) {
            return;
        }
        ctx.beginPath();
        if (dashSegments) {
            setLineDash(ctx, dashSegments);
        }
        points.forEach(({ x, y }, idx) => {
            if (idx === 0) {
                ctx.moveTo(x, y);
                return;
            }
            ctx.lineTo(x, y);
        });
        ctx.lineTo(points[0].x, points[0].y);
        if (fillColor) {
            fillStyle(ctx, fillColor);
        }
        strokeWithOptions(ctx, { lineWidth, strokeStyle });
        ctx.closePath();
    }

    function regularPolygon(ctx, model) {
        const { numberOfSides, size, x, y, borderColor, borderWidth, fillColor } = model;
        const s = size / 2;
        const shift = numberOfSides % 2 ? (Math.PI / 180.0) * (10 + (numberOfSides - 3) / 2) * numberOfSides : 0;
        const step = (2 * Math.PI) / numberOfSides;
        ctx.beginPath();
        for (let i = 0; i <= numberOfSides; i += 1) {
            const curStep = i * step + shift;
            ctx.lineTo(x + s * Math.cos(curStep), y + s * Math.sin(curStep));
        }
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        fillStyle(ctx, fillColor);
        ctx.stroke();
        ctx.closePath();
    }
    // https://programmingthomas.wordpress.com/2012/05/16/drawing-stars-with-html5-canvas/
    function star(ctx, model) {
        const { x, y, borderColor, borderWidth, size, fillColor } = model;
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = fillColor;
        ctx.save();
        ctx.beginPath();
        ctx.translate(x, y);
        ctx.moveTo(0, -size);
        for (let i = 0; i < 5; i += 1) {
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -size / 2);
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -size);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.closePath();
    }
    function cross(ctx, model) {
        const { x, y, borderColor, borderWidth, size, fillColor } = model;
        const quarter = size / 4;
        const half = size / 2;
        const xPointsOffset = [
            -half,
            -half,
            -quarter,
            -quarter,
            quarter,
            quarter,
            half,
            half,
            quarter,
            quarter,
            -quarter,
            -quarter,
        ];
        const yPointsOffset = [];
        for (let idx = 0, len = xPointsOffset.length; idx < len; idx += 1) {
            const startIdx = 9;
            yPointsOffset.push(xPointsOffset[(startIdx + idx) % len]);
        }
        polygon(ctx, {
            type: 'polygon',
            lineWidth: borderWidth,
            color: borderColor,
            points: xPointsOffset.map((val, idx) => ({ x: x + val, y: y + yPointsOffset[idx] })),
            fillColor,
        });
    }
    function getNumberOfSidesByIconType(iconType) {
        switch (iconType) {
            case 'triangle':
                return 3;
            case 'diamond':
                return 4;
            case 'pentagon':
                return 5;
            case 'hexagon':
                return 6;
        }
    }
    function scatterSeries(ctx, model) {
        const { x, y, borderColor, borderWidth, fillColor, iconType, size } = model;
        const commonModel = { x, y, fillColor, borderColor, borderWidth, size };
        ctx.beginPath();
        switch (iconType) {
            case 'rect':
                pathRect(ctx, {
                    type: 'pathRect',
                    x: x - size / 2,
                    y: y - size / 2,
                    width: size,
                    height: size,
                    stroke: borderColor,
                    lineWidth: borderWidth,
                    fill: fillColor,
                });
                break;
            case 'triangle':
            case 'pentagon':
            case 'diamond':
            case 'hexagon':
                regularPolygon(ctx, Object.assign({ type: 'regularPolygon', numberOfSides: getNumberOfSidesByIconType(iconType) }, commonModel));
                break;
            case 'star':
                star(ctx, Object.assign(Object.assign({ type: 'star' }, commonModel), { size: size / 2 }));
                break;
            case 'cross':
                cross(ctx, Object.assign({ type: 'cross' }, commonModel));
                break;
            default:
                circle(ctx, {
                    type: 'circle',
                    x,
                    y,
                    radius: size / 2,
                    style: [{ strokeStyle: borderColor, lineWidth: borderWidth }],
                    color: fillColor,
                });
        }
        ctx.stroke();
        ctx.closePath();
    }

    const LEGEND_ITEM_MARGIN_X = 40;
    const LEGEND_MARGIN_X = 5;
    const LEGEND_CHECKBOX_SIZE = 12;
    const LEGEND_ICON_SIZE = 12;
    const ICON_BORDER_WIDTH = 1.5;
    const INACTIVE_OPACITY = 0.3;
    const RECT_SIZE = 10;
    const LINE_ICON_PADDING = 2;
    const CIRCLE_ICON_RADIUS = 6;
    function getLegendItemHeight(fontSize) {
        return fontSize + padding.Y;
    }
    function drawLineIcon(ctx, x, y, color) {
        const xCurveOffset = [2, 2, 6, 6, 10, 10];
        const yCurveOffset = [8, 0, 0, 8, 8, 0];
        xCurveOffset.forEach((xOffset, idx) => {
            if (idx === 5) {
                return;
            }
            line(ctx, {
                type: 'line',
                x: x + xOffset,
                y: y + yCurveOffset[idx],
                x2: x + xCurveOffset[idx + 1],
                y2: y + yCurveOffset[idx + 1],
                lineWidth: 2,
                strokeStyle: color,
            });
        });
    }
    function drawCheckIcon(ctx, x, y, active) {
        const color = '#555555';
        const strokeStyle = active ? color : getRGBA(color, INACTIVE_OPACITY);
        line(ctx, {
            type: 'line',
            x: x + 2,
            y: y + 5,
            x2: x + 5,
            y2: y + 8,
            strokeStyle,
            lineWidth: 2,
        });
        line(ctx, {
            type: 'line',
            x: x + 5,
            y: y + 9,
            x2: x + 10,
            y2: y + 3,
            strokeStyle,
            lineWidth: 2,
        });
    }
    function drawCheckbox(ctx, x, y, renderOptions) {
        const { active, checked } = renderOptions;
        const borderColor = active ? '#bbb' : getRGBA('#bbbbbb', INACTIVE_OPACITY);
        rect(ctx, {
            type: 'rect',
            x,
            y,
            width: LEGEND_CHECKBOX_SIZE,
            height: LEGEND_CHECKBOX_SIZE,
            color: '#fff',
            borderColor,
            thickness: 1,
        });
        if (checked) {
            drawCheckIcon(ctx, x, y, active);
        }
    }
    function drawIcon(ctx, x, y, renderOptions) {
        const { iconType, active, color, showCheckbox } = renderOptions;
        const iconX = x + (showCheckbox ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0);
        const iconColor = active ? color : getRGBA(color, INACTIVE_OPACITY);
        if (iconType === 'rect') {
            rect(ctx, {
                type: 'rect',
                x: iconX,
                y: y + (LEGEND_CHECKBOX_SIZE - RECT_SIZE) / 2,
                width: RECT_SIZE,
                height: RECT_SIZE,
                color: iconColor,
            });
        }
        else if (iconType === 'line') {
            drawLineIcon(ctx, iconX, y + LINE_ICON_PADDING, iconColor);
        }
        else if (iconType === 'circle') {
            circle(ctx, {
                type: 'circle',
                x: iconX + CIRCLE_ICON_RADIUS,
                y: y + CIRCLE_ICON_RADIUS,
                radius: CIRCLE_ICON_RADIUS,
                color: iconColor,
                style: ['default'],
            });
        }
    }
    function drawScatterIcon(ctx, x, y, renderOptions) {
        const { iconType, active, color, showCheckbox } = renderOptions;
        const iconX = x + (showCheckbox ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0);
        const iconColor = active ? color : getRGBA(color, INACTIVE_OPACITY);
        scatterSeries(ctx, {
            type: 'scatterSeries',
            iconType: iconType,
            x: iconX + CIRCLE_ICON_RADIUS,
            y: y + CIRCLE_ICON_RADIUS,
            borderColor: iconColor,
            size: CIRCLE_ICON_RADIUS * 2,
            fillColor: 'rgba(255, 255, 255, 0)',
            borderWidth: ICON_BORDER_WIDTH,
        });
    }
    function drawLabel(ctx, x, y, text, renderOptions) {
        const { active, showCheckbox, font, fontColor } = renderOptions;
        const fillStyle = active ? fontColor : getRGBA(fontColor, INACTIVE_OPACITY);
        label(ctx, {
            type: 'label',
            x: x +
                LEGEND_ICON_SIZE +
                LEGEND_MARGIN_X +
                (showCheckbox ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0),
            y,
            text,
            style: ['default', { font, textBaseline: 'top', fillStyle }],
        });
    }
    function legend$2(ctx, model) {
        const { data, showCheckbox, align, fontSize, fontFamily, fontWeight } = model;
        const font = getTitleFontString({ fontSize, fontFamily, fontWeight });
        const fontColor = model.color;
        data.forEach((datum) => {
            const { x, y, checked, active, color, iconType, useScatterChartIcon, viewLabel: legendLabel, } = datum;
            const iconY = y - 1 + (getTextHeight(legendLabel, font) - 11) / 4;
            const renderOptions = {
                iconType,
                checked,
                active,
                color,
                showCheckbox,
                align,
                font,
                fontColor,
            };
            if (showCheckbox) {
                drawCheckbox(ctx, x, iconY, renderOptions);
            }
            if (useScatterChartIcon && iconType !== 'line') {
                drawScatterIcon(ctx, x, iconY, renderOptions);
            }
            else {
                drawIcon(ctx, x, iconY, renderOptions);
            }
            drawLabel(ctx, x, y, legendLabel, renderOptions);
        });
    }

    var legendBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        LEGEND_ITEM_MARGIN_X: LEGEND_ITEM_MARGIN_X,
        LEGEND_MARGIN_X: LEGEND_MARGIN_X,
        LEGEND_CHECKBOX_SIZE: LEGEND_CHECKBOX_SIZE,
        LEGEND_ICON_SIZE: LEGEND_ICON_SIZE,
        getLegendItemHeight: getLegendItemHeight,
        legend: legend$2
    });

    const DEFAULT_LINE_SERIES_WIDTH = 2;
    const DEFAULT_LINE_SERIES_DOT_RADIUS = 3;
    const DEFAULT_AREA_OPACITY = 0.3;
    const DEFAULT_AREA_SELECTED_SERIES_OPACITY = DEFAULT_AREA_OPACITY;
    const DEFAULT_AREA_UNSELECTED_SERIES_OPACITY = 0.06;
    const radarDefault = {
        LINE_WIDTH: 2,
        DOT_RADIUS: 3,
        HOVER_DOT_RADIUS: 4,
        SELECTED_SERIES_OPACITY: 0.3,
        UNSELECTED_SERIES_OPACITY: 0.05,
    };
    const boxDefault = {
        HOVER_THICKNESS: 4,
        BOX_HOVER: {
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 6,
        },
    };
    const boxplotDefault = {
        OUTLIER_RADIUS: 4,
        OUTLIER_BORDER_WIDTH: 2,
        LINE_TYPE: {
            whisker: { lineWidth: 1 },
            maximum: { lineWidth: 1 },
            minimum: { lineWidth: 1 },
            median: { lineWidth: 1, color: '#ffffff' },
        },
    };
    const DEFAULT_PIE_LINE_WIDTH = 3;
    function makeDefaultDataLabelsTheme(globalFontFamily = 'Arial') {
        return {
            fontFamily: globalFontFamily,
            fontSize: 11,
            fontWeight: 400,
            color: '#333333',
            useSeriesColor: false,
        };
    }
    const DEFAULT_BUBBLE_ARROW = {
        width: 8,
        height: 6,
    };
    const defaultSeriesTheme = {
        colors: [
            '#00a9ff',
            '#ffb840',
            '#ff5a46',
            '#00bd9f',
            '#785fff',
            '#f28b8c',
            '#989486',
            '#516f7d',
            '#28e6eb',
            '#28695f',
            '#96c85a',
            '#45ba3f',
            '#295ba0',
            '#2a4175',
            '#289399',
            '#66c8d3',
            '#617178',
            '#8a9a9a',
            '#bebebe',
            '#374b5a',
            '#64eba0',
            '#ffe155',
            '#ff9141',
            '#af4beb',
            '#ff73fa',
            '#ff55b2',
            '#2869f5',
            '#3296ff',
            '#8cc3ff',
            '#2828b9',
            '#fa8787',
            '#e13782',
            '#7d5aaa',
            '#643c91',
            '#d25f5f',
            '#fabe6e',
            '#c3a9eb',
            '#b9c8f5',
            '#73a0cd',
            '#0f5a8c',
        ],
        startColor: '#ffe98a',
        endColor: '#d74177',
        lineWidth: DEFAULT_LINE_SERIES_WIDTH,
        dashSegments: [],
        borderWidth: 0,
        borderColor: '#ffffff',
        select: {
            dot: {
                radius: DEFAULT_LINE_SERIES_DOT_RADIUS,
                borderWidth: DEFAULT_LINE_SERIES_DOT_RADIUS + 2,
            },
            areaOpacity: DEFAULT_AREA_SELECTED_SERIES_OPACITY,
            restSeries: {
                areaOpacity: DEFAULT_AREA_UNSELECTED_SERIES_OPACITY,
            },
        },
        hover: {
            dot: {
                radius: DEFAULT_LINE_SERIES_DOT_RADIUS,
                borderWidth: DEFAULT_LINE_SERIES_DOT_RADIUS + 2,
            },
        },
        dot: {
            radius: DEFAULT_LINE_SERIES_DOT_RADIUS,
        },
        areaOpacity: DEFAULT_AREA_OPACITY,
    };
    function makeAxisTitleTheme(globalFontFamily = 'Arial') {
        return {
            fontSize: 11,
            fontFamily: globalFontFamily,
            fontWeight: 700,
            color: '#bbbbbb',
        };
    }
    function makeCommonTextTheme(globalFontFamily = 'Arial') {
        return { fontSize: 11, fontFamily: globalFontFamily, fontWeight: 'normal', color: '#333333' };
    }
    function makeDefaultTheme(series, globalFontFamily = 'Arial') {
        var _a, _b;
        const axisTitleTheme = makeAxisTitleTheme(globalFontFamily);
        const commonTextTheme = makeCommonTextTheme(globalFontFamily);
        const hasRadarSeries = !!((_a = series) === null || _a === void 0 ? void 0 : _a.radar);
        const hasGaugeSeries = !!((_b = series) === null || _b === void 0 ? void 0 : _b.gauge);
        return {
            chart: {
                fontFamily: globalFontFamily,
                backgroundColor: '#ffffff',
            },
            noData: {
                fontSize: 18,
                fontFamily: globalFontFamily,
                fontWeight: 'normal',
                color: '#333333',
            },
            title: {
                fontSize: 18,
                fontFamily: globalFontFamily,
                fontWeight: 100,
                color: '#333333',
            },
            yAxis: {
                title: Object.assign({}, axisTitleTheme),
                label: Object.assign({}, commonTextTheme),
                width: 1,
                color: '#333333',
            },
            xAxis: {
                title: Object.assign({}, axisTitleTheme),
                label: Object.assign({}, commonTextTheme),
                width: 1,
                color: '#333333',
            },
            verticalAxis: {
                label: Object.assign(Object.assign({}, commonTextTheme), { textBubble: {
                        visible: hasRadarSeries,
                        backgroundColor: hasRadarSeries ? '#f3f3f3' : 'rgba(0, 0, 0, 0)',
                        borderRadius: 7,
                        paddingX: 7,
                        paddingY: 2,
                        borderColor: 'rgba(0, 0, 0, 0)',
                        borderWidth: 1,
                    } }),
            },
            circularAxis: {
                title: Object.assign({}, axisTitleTheme),
                label: Object.assign({}, commonTextTheme),
                lineWidth: 1,
                strokeStyle: hasGaugeSeries ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.05)',
                dotColor: 'rgba(0, 0, 0, 0.5)',
                tick: {
                    lineWidth: 1,
                    strokeStyle: 'rgba(0, 0, 0, 0.5)',
                },
            },
            legend: {
                label: {
                    color: '#333333',
                    fontSize: 11,
                    fontWeight: 'normal',
                    fontFamily: globalFontFamily,
                },
            },
            tooltip: {
                background: 'rgba(85, 85, 85, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0)',
                borderWidth: 0,
                borderRadius: 3,
                borderStyle: 'solid',
                body: {
                    fontSize: 12,
                    fontFamily: `${globalFontFamily}, sans-serif`,
                    fontWeight: 'normal',
                    color: '#ffffff',
                },
                header: {
                    fontSize: 13,
                    fontFamily: `${globalFontFamily}, sans-serif`,
                    fontWeight: 'bold',
                    color: '#ffffff',
                },
            },
            plot: {
                lineColor: 'rgba(0, 0, 0, 0.05)',
                backgroundColor: 'rgba(255, 255, 255, 0)',
            },
            exportMenu: {
                button: Object.assign(Object.assign({}, makeBorderTheme(5, '#f4f4f4')), { backgroundColor: '#f4f4f4', xIcon: {
                        color: '#555555',
                        lineWidth: 2,
                    }, dotIcon: {
                        color: '#555555',
                        width: 2,
                        height: 2,
                        gap: 2,
                    } }),
                panel: Object.assign(Object.assign({}, makeBorderTheme(0, '#bab9ba')), { header: Object.assign(Object.assign({}, commonTextTheme), { backgroundColor: '#f4f4f4' }), body: Object.assign(Object.assign({}, commonTextTheme), { backgroundColor: '#ffffff' }) }),
            },
        };
    }
    function makeBorderTheme(borderRadius, borderColor, borderWidth = 1) {
        return { borderWidth, borderRadius, borderColor };
    }
    function makeDefaultTextBubbleTheme(visible = false, borderRadius = 7, paddingX = 5, paddingY = 1, backgroundColor = '#ffffff') {
        return {
            visible,
            paddingX,
            paddingY,
            borderRadius,
            backgroundColor,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffsetY: 2,
            shadowBlur: 4,
        };
    }
    function getLineTypeSeriesTheme(globalFontFamily) {
        const defaultDataLabelTheme = makeDefaultDataLabelsTheme(globalFontFamily);
        return {
            lineWidth: defaultSeriesTheme.lineWidth,
            dashSegments: defaultSeriesTheme.dashSegments,
            select: { dot: defaultSeriesTheme.select.dot },
            hover: { dot: defaultSeriesTheme.hover.dot },
            dot: defaultSeriesTheme.dot,
            dataLabels: Object.assign(Object.assign({}, defaultDataLabelTheme), { textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme()), { arrow: Object.assign({ visible: false, direction: 'bottom' }, DEFAULT_BUBBLE_ARROW) }) }),
        };
    }
    function getTreemapHeatmapSeriesTheme(globalFontFamily) {
        const defaultDataLabelTheme = makeDefaultDataLabelsTheme(globalFontFamily);
        return {
            startColor: defaultSeriesTheme.startColor,
            endColor: defaultSeriesTheme.endColor,
            borderWidth: 0,
            borderColor: '#ffffff',
            hover: {
                borderWidth: boxDefault.HOVER_THICKNESS,
                borderColor: '#ffffff',
            },
            select: {
                borderWidth: boxDefault.HOVER_THICKNESS,
                borderColor: '#ffffff',
            },
            dataLabels: Object.assign(Object.assign({}, defaultDataLabelTheme), { color: '#ffffff', textBubble: Object.assign({}, makeDefaultTextBubbleTheme(false, 1, 5, 1, 'rgba(255, 255, 255, 0.5)')) }),
        };
    }
    function getBarColumnSeriesTheme(globalFontFamily) {
        const defaultDataLabelTheme = makeDefaultDataLabelsTheme(globalFontFamily);
        return {
            areaOpacity: 1,
            hover: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff', groupedRect: {
                    color: '#000000',
                    opacity: 0.05,
                } }),
            select: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff', groupedRect: {
                    color: '#000000',
                    opacity: 0.2,
                }, restSeries: {
                    areaOpacity: 0.2,
                }, areaOpacity: 1 }),
            connector: {
                color: 'rgba(51, 85, 139, 0.3)',
                lineWidth: 1,
                dashSegments: [],
            },
            dataLabels: Object.assign(Object.assign({}, defaultDataLabelTheme), { textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme(false, 1, 4, 3)), { arrow: Object.assign({ visible: false }, DEFAULT_BUBBLE_ARROW) }), stackTotal: Object.assign(Object.assign({}, defaultDataLabelTheme), { textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme(true, 1, 4, 3)), { arrow: Object.assign({ visible: true }, DEFAULT_BUBBLE_ARROW) }) }) }),
        };
    }
    const transparentColor = 'rgba(255, 255, 255, 0)';
    const defaultThemeMakers = {
        line: (globalFontFamily) => (Object.assign({}, getLineTypeSeriesTheme(globalFontFamily))),
        area: (globalFontFamily) => {
            const lineTypeSeriesTheme = getLineTypeSeriesTheme(globalFontFamily);
            return Object.assign(Object.assign({}, lineTypeSeriesTheme), { select: Object.assign(Object.assign({}, lineTypeSeriesTheme.select), { areaOpacity: DEFAULT_AREA_SELECTED_SERIES_OPACITY, restSeries: defaultSeriesTheme.select.restSeries }), areaOpacity: DEFAULT_AREA_OPACITY });
        },
        treemap: (globalFontFamily) => getTreemapHeatmapSeriesTheme(globalFontFamily),
        heatmap: (globalFontFamily) => getTreemapHeatmapSeriesTheme(globalFontFamily),
        scatter: () => ({
            size: 12,
            borderWidth: 1.5,
            fillColor: transparentColor,
            select: {
                fillColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 2.5,
                size: 12,
            },
            hover: {
                fillColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 2.5,
                size: 12,
            },
        }),
        bubble: () => ({
            borderWidth: 0,
            borderColor: transparentColor,
            select: {},
            hover: {
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 2,
                shadowOffsetY: 2,
                lineWidth: 2,
            },
        }),
        radar: () => ({
            areaOpacity: radarDefault.SELECTED_SERIES_OPACITY,
            hover: {
                dot: {
                    radius: radarDefault.HOVER_DOT_RADIUS,
                    borderWidth: radarDefault.HOVER_DOT_RADIUS + 1,
                },
            },
            select: {
                dot: {
                    radius: radarDefault.HOVER_DOT_RADIUS,
                    borderWidth: radarDefault.HOVER_DOT_RADIUS + 1,
                },
                restSeries: {
                    areaOpacity: radarDefault.UNSELECTED_SERIES_OPACITY,
                },
                areaOpacity: radarDefault.SELECTED_SERIES_OPACITY,
            },
            dot: {
                radius: radarDefault.DOT_RADIUS,
            },
        }),
        bar: (globalFontFamily) => (Object.assign({}, getBarColumnSeriesTheme(globalFontFamily))),
        column: (globalFontFamily) => (Object.assign({}, getBarColumnSeriesTheme(globalFontFamily))),
        bullet: (globalFontFamily) => {
            const defaultDataLabelTheme = makeDefaultDataLabelsTheme(globalFontFamily);
            return {
                areaOpacity: 1,
                barWidthRatios: {
                    rangeRatio: 1,
                    bulletRatio: 0.5,
                    markerRatio: 0.8,
                },
                markerLineWidth: 1,
                borderWidth: 0,
                borderColor: 'rgba(255, 255, 255, 0)',
                hover: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff', groupedRect: {
                        color: '#000000',
                        opacity: 0.05,
                    } }),
                select: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff', groupedRect: {
                        color: '#000000',
                        opacity: 0.2,
                    }, restSeries: {
                        areaOpacity: 0.2,
                    }, areaOpacity: 1 }),
                dataLabels: Object.assign(Object.assign({}, defaultDataLabelTheme), { textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme()), { arrow: Object.assign({ visible: false }, DEFAULT_BUBBLE_ARROW) }), marker: Object.assign(Object.assign({}, defaultDataLabelTheme), { fontSize: 9, useSeriesColor: true, textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme(true)), { backgroundColor: 'rgba(255, 255, 255, 0.8)', shadowColor: 'rgba(0, 0, 0, 0.0)', shadowOffsetX: 0, shadowOffsetY: 0, shadowBlur: 0, arrow: Object.assign({ visible: false }, DEFAULT_BUBBLE_ARROW) }) }) }),
            };
        },
        boxPlot: () => ({
            areaOpacity: 1,
            barWidthRatios: {
                barRatio: 1,
                minMaxBarRatio: 0.5,
            },
            markerLineWidth: 1,
            dot: {
                color: '#ffffff',
                radius: boxplotDefault.OUTLIER_RADIUS,
                borderWidth: boxplotDefault.OUTLIER_BORDER_WIDTH,
                useSeriesColor: false,
            },
            rect: { borderWidth: 0 },
            line: Object.assign({}, boxplotDefault.LINE_TYPE),
            hover: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { rect: { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff' }, dot: {
                    radius: boxplotDefault.OUTLIER_RADIUS,
                    borderWidth: 0,
                    useSeriesColor: true,
                }, line: Object.assign({}, boxplotDefault.LINE_TYPE) }),
            select: Object.assign(Object.assign({}, boxDefault.BOX_HOVER), { rect: { borderWidth: boxDefault.HOVER_THICKNESS, borderColor: '#ffffff' }, dot: {
                    radius: boxplotDefault.OUTLIER_RADIUS,
                    borderWidth: 0,
                    useSeriesColor: true,
                }, line: Object.assign({}, boxplotDefault.LINE_TYPE), restSeries: {
                    areaOpacity: 0.2,
                }, areaOpacity: 1 }),
        }),
        pie: (globalFontFamily, { hasOuterAnchor = false, hasOuterAnchorPieSeriesName = false }, isNestedPieChart = false) => {
            const defaultDataLabelTheme = makeDefaultDataLabelsTheme(globalFontFamily);
            return {
                areaOpacity: 1,
                strokeStyle: isNestedPieChart ? '#ffffff' : 'rgba(255, 255, 255, 0)',
                lineWidth: isNestedPieChart ? 1 : 0,
                hover: {
                    lineWidth: DEFAULT_PIE_LINE_WIDTH,
                    strokeStyle: '#ffffff',
                    shadowColor: '#cccccc',
                    shadowBlur: 5,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                },
                select: {
                    lineWidth: DEFAULT_PIE_LINE_WIDTH,
                    strokeStyle: '#ffffff',
                    shadowColor: '#cccccc',
                    shadowBlur: 5,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    restSeries: {
                        areaOpacity: 0.3,
                    },
                    areaOpacity: 1,
                },
                dataLabels: {
                    fontFamily: globalFontFamily,
                    fontSize: 16,
                    fontWeight: 600,
                    color: hasOuterAnchor ? '#333333' : '#ffffff',
                    useSeriesColor: hasOuterAnchor,
                    textBubble: Object.assign({}, makeDefaultTextBubbleTheme(false, 0)),
                    callout: {
                        lineWidth: 1,
                        useSeriesColor: true,
                        lineColor: '#e9e9e9',
                    },
                    pieSeriesName: Object.assign(Object.assign({}, defaultDataLabelTheme), { useSeriesColor: hasOuterAnchorPieSeriesName, color: hasOuterAnchorPieSeriesName ? '#333333' : '#ffffff', textBubble: Object.assign({}, makeDefaultTextBubbleTheme(false, 0)) }),
                },
            };
        },
        radialBar: (globalFontFamily) => ({
            areaOpacity: 1,
            strokeStyle: 'rgba(255, 255, 255, 0)',
            lineWidth: 0,
            hover: {
                lineWidth: DEFAULT_PIE_LINE_WIDTH,
                strokeStyle: '#fff',
                shadowColor: '#cccccc',
                shadowBlur: 5,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                groupedSector: {
                    color: '#000000',
                    opacity: 0.05,
                },
            },
            select: {
                lineWidth: DEFAULT_PIE_LINE_WIDTH,
                strokeStyle: '#fff',
                shadowColor: '#cccccc',
                shadowBlur: 5,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                restSeries: {
                    areaOpacity: 0.3,
                },
                areaOpacity: 1,
                groupedSector: {
                    color: '#000000',
                    opacity: 0.2,
                },
            },
            dataLabels: {
                fontFamily: globalFontFamily,
                fontSize: 11,
                fontWeight: 400,
                color: '#333333',
                useSeriesColor: false,
                textBubble: Object.assign({}, makeDefaultTextBubbleTheme(false, 0)),
            },
        }),
        gauge: (globalFontFamily) => ({
            areaOpacity: 1,
            hover: {
                clockHand: { baseLine: 5 },
                pin: { radius: 5, borderWidth: 5 },
                solid: {
                    lineWidth: DEFAULT_PIE_LINE_WIDTH,
                    strokeStyle: '#ffffff',
                    shadowColor: '#cccccc',
                    shadowBlur: 5,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                },
            },
            select: {
                clockHand: { baseLine: 5 },
                pin: { radius: 6, borderWidth: 4 },
                solid: {
                    lineWidth: DEFAULT_PIE_LINE_WIDTH,
                    strokeStyle: '#ffffff',
                    shadowColor: '#cccccc',
                    shadowBlur: 5,
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                    restSeries: {
                        areaOpacity: 0.3,
                    },
                    areaOpacity: 1,
                },
                areaOpacity: 1,
                restSeries: { areaOpacity: 0.3 },
            },
            clockHand: { baseLine: 4 },
            pin: { radius: 5, borderWidth: 5 },
            solid: {
                lineWidth: 0,
                backgroundSolid: { color: 'rgba(0, 0, 0, 0.1)' },
            },
            dataLabels: {
                fontFamily: globalFontFamily,
                fontSize: 11,
                fontWeight: 400,
                color: '#333333',
                useSeriesColor: false,
                textBubble: Object.assign(Object.assign({}, makeDefaultTextBubbleTheme(true, 4, 4, 3)), { shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetY: 0, shadowBlur: 0, borderColor: '#ccc', borderWidth: 1 }),
            },
        }),
    };
    function getSeriesTheme(globalFontFamily, seriesName, paramForPieSeries, isNestedPieChart = false) {
        if (seriesName === 'pie') {
            return defaultThemeMakers[seriesName](globalFontFamily, paramForPieSeries, isNestedPieChart);
        }
        if (includes(['bubble', 'radar', 'boxPlot'], seriesName)) {
            return defaultThemeMakers[seriesName]();
        }
        return defaultThemeMakers[seriesName](globalFontFamily);
    }
    function getDefaultTheme(series, pieSeriesOuterAnchors, globalFontFamily = 'Arial', isNestedPieChart = false) {
        const result = Object.keys(series).reduce((acc, seriesName) => (Object.assign(Object.assign({}, acc), { series: Object.assign(Object.assign({}, acc.series), { [seriesName]: getSeriesTheme(globalFontFamily, seriesName, pieSeriesOuterAnchors) }) })), makeDefaultTheme(series, globalFontFamily));
        if (isNestedPieChart) {
            const aliasNames = getNestedPieChartAliasNames(series);
            result.series.pie = aliasNames.reduce((acc, cur) => (Object.assign(Object.assign({}, acc), { [cur]: getSeriesTheme(globalFontFamily, 'pie', pieSeriesOuterAnchors[cur], isNestedPieChart) })), {});
        }
        return result;
    }

    function isAvailableShowTooltipInfo(info, eventDetectType, targetChartType) {
        const { index, seriesIndex, chartType } = info;
        return (isNumber(index) &&
            (eventDetectType === 'grouped' || isNumber(seriesIndex)) &&
            (isUndefined(chartType) || chartType === targetChartType));
    }
    function isAvailableSelectSeries(info, targetChartType) {
        const { index, seriesIndex, chartType } = info;
        return (isNumber(index) &&
            isNumber(seriesIndex) &&
            (isUndefined(chartType) || chartType === targetChartType));
    }
    function isNoData(series) {
        return Object.keys(series).reduce((acc, chartType) => !series[chartType].data.length && acc, true);
    }

    function getActiveSeriesMap(legend) {
        return legend.data.reduce((acc, { active, label }) => (Object.assign(Object.assign({}, acc), { [label]: active })), {});
    }
    function showCircleLegend(options) {
        var _a, _b, _c;
        return _c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.circleLegend) === null || _b === void 0 ? void 0 : _b.visible, (_c !== null && _c !== void 0 ? _c : true);
    }
    function showLegend(options, series) {
        var _a, _b, _c;
        if (series.gauge ||
            (series.treemap && !((_a = options.series) === null || _a === void 0 ? void 0 : _a.useColorValue))) {
            return false;
        }
        return isUndefined((_b = options.legend) === null || _b === void 0 ? void 0 : _b.visible) ? true : !!((_c = options.legend) === null || _c === void 0 ? void 0 : _c.visible);
    }
    function showCheckbox(options) {
        var _a, _b;
        return isUndefined((_a = options.legend) === null || _a === void 0 ? void 0 : _a.showCheckbox) ? true : !!((_b = options.legend) === null || _b === void 0 ? void 0 : _b.showCheckbox);
    }
    // @TODO: Need to manage with chart type constant/Enum
    function useRectIcon(type) {
        return includes(['bar', 'column', 'area', 'pie', 'boxPlot', 'bullet', 'radialBar'], type);
    }
    function useCircleIcon(type) {
        return includes(['bubble', 'scatter'], type);
    }
    function useLineIcon(type) {
        return includes(['line', 'radar'], type);
    }
    function getIconType(type) {
        let iconType = 'spectrum';
        if (useCircleIcon(type)) {
            iconType = 'circle';
        }
        else if (useRectIcon(type)) {
            iconType = 'rect';
        }
        else if (useLineIcon(type)) {
            iconType = 'line';
        }
        return iconType;
    }
    function getLegendAlign(options) {
        var _a, _b;
        return _b = (_a = options.legend) === null || _a === void 0 ? void 0 : _a.align, (_b !== null && _b !== void 0 ? _b : 'right');
    }

    const INITIAL_LEGEND_WIDTH = 100;
    const INITIAL_CIRCLE_LEGEND_WIDTH = 150;
    const COMPONENT_HEIGHT_EXCEPT_Y_AXIS = 100;
    const ELLIPSIS_DOT_TEXT = '...';
    const WIDEST_TEXT = 'W'; // The widest text width in Arial font.
    const NUMBER_OF_BOTH_SIDES = 2;
    function recalculateLegendWhenHeightOverflows(params, legendHeight) {
        const { legendWidths, itemHeight } = params;
        const totalHeight = legendWidths.length * itemHeight;
        const columnCount = Math.ceil(totalHeight / legendHeight);
        const rowCount = legendWidths.length / columnCount;
        let legendWidth = 0;
        range(0, columnCount).forEach((count) => {
            legendWidth += Math.max(...legendWidths.slice(count * rowCount, (count + 1) * rowCount));
        });
        legendWidth += LEGEND_ITEM_MARGIN_X * (columnCount - 1);
        return { legendWidth, legendHeight: rowCount * itemHeight + padding.Y, columnCount, rowCount };
    }
    function recalculateLegendWhenWidthOverflows(params, prevLegendWidth) {
        const { legendWidths, itemHeight } = params;
        let columnCount = 0;
        let legendWidth = 0;
        const { rowCount } = legendWidths.reduce((acc, width) => {
            const widthWithMargin = LEGEND_ITEM_MARGIN_X + width;
            if (acc.totalWidth + width > prevLegendWidth) {
                acc.totalWidth = widthWithMargin;
                acc.rowCount += 1;
                acc.columnCount = 1;
                columnCount = Math.max(columnCount, acc.columnCount);
            }
            else {
                acc.totalWidth += widthWithMargin;
                acc.columnCount += 1;
            }
            legendWidth = Math.max(legendWidth, acc.totalWidth);
            return acc;
        }, { totalWidth: 0, rowCount: 1, columnCount: 0 });
        return { legendHeight: itemHeight * rowCount, rowCount, columnCount, legendWidth };
    }
    function calculateLegendSize(params) {
        if (!params.visible) {
            return { legendWidth: 0, legendHeight: 0, rowCount: 0, columnCount: 0 };
        }
        const { chart, verticalAlign, legendWidths } = params;
        const { legendWidth, isOverflow: widthOverflow } = calculateLegendWidth(params);
        const { legendHeight, isOverflow: heightOverflow } = calculateLegendHeight(params);
        const columnCount = verticalAlign ? legendWidths.length : 1;
        const rowCount = verticalAlign ? Math.ceil(legendWidth / chart.width) : legendWidths.length;
        if (widthOverflow) {
            return recalculateLegendWhenWidthOverflows(params, legendWidth / rowCount);
        }
        if (heightOverflow) {
            return recalculateLegendWhenHeightOverflows(params, legendHeight);
        }
        return { legendWidth, legendHeight, columnCount, rowCount };
    }
    function calculateLegendHeight(params) {
        const { verticalAlign, itemHeight, legendWidths } = params;
        const { height: chartHeight } = getDefaultLegendSize(params);
        let legendHeight;
        let isOverflow = false;
        if (verticalAlign) {
            legendHeight = chartHeight;
        }
        else {
            const totalHeight = legendWidths.length * itemHeight;
            isOverflow = chartHeight < totalHeight;
            legendHeight = isOverflow ? chartHeight : totalHeight;
        }
        return { legendHeight, isOverflow };
    }
    function getSpectrumLegendWidth(legendWidths, chartWidth, verticalAlign) {
        if (verticalAlign) {
            const labelAreaWidth = sum(legendWidths);
            return Math.max(chartWidth / 4, labelAreaWidth);
        }
        const spectrumAreaWidth = (spectrumLegendTooltip.PADDING + spectrumLegendBar.PADDING + padding.X) * NUMBER_OF_BOTH_SIDES +
            spectrumLegendTooltip.POINT_HEIGHT +
            spectrumLegendBar.HEIGHT;
        return Math.max(...legendWidths) + spectrumAreaWidth;
    }
    function getSpectrumLegendHeight(itemHeight, chartHeight, verticalAlign) {
        return verticalAlign
            ? SPECTRUM_LEGEND_LABEL_HEIGHT +
                spectrumLegendBar.PADDING * NUMBER_OF_BOTH_SIDES +
                spectrumLegendTooltip.POINT_HEIGHT +
                spectrumLegendTooltip.HEIGHT +
                padding.Y
            : (chartHeight * 3) / 4;
    }
    function getNormalLegendWidth(params) {
        const { initialWidth, legendWidths, checkbox, verticalAlign } = params;
        let isOverflow = false;
        let legendWidth;
        if (verticalAlign) {
            const { width: chartWidth } = getDefaultLegendSize(params);
            const totalWidth = sum(legendWidths) + LEGEND_ITEM_MARGIN_X * (legendWidths.length - 1);
            isOverflow = totalWidth > chartWidth;
            legendWidth = totalWidth;
        }
        else {
            const labelAreaWidth = Math.max(...legendWidths);
            legendWidth =
                (checkbox ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0) +
                    LEGEND_ICON_SIZE +
                    LEGEND_MARGIN_X +
                    Math.max(labelAreaWidth, initialWidth);
        }
        return { legendWidth, isOverflow };
    }
    function calculateLegendWidth(params) {
        var _a, _b;
        const { options, visible } = params;
        const legendOptions = (_a = options) === null || _a === void 0 ? void 0 : _a.legend;
        if (!visible) {
            return { legendWidth: 0, isOverflow: false };
        }
        if ((_b = legendOptions) === null || _b === void 0 ? void 0 : _b.width) {
            return { legendWidth: legendOptions.width, isOverflow: false };
        }
        return getNormalLegendWidth(params);
    }
    function getDefaultLegendSize(params) {
        const { verticalAlign, chart, itemHeight, initialWidth, circleLegendVisible } = params;
        const restAreaHeight = COMPONENT_HEIGHT_EXCEPT_Y_AXIS + (circleLegendVisible ? INITIAL_CIRCLE_LEGEND_WIDTH : 0); // rest area temporary value (yAxisTitle.height + xAxis.height + circleLegend.height)
        return verticalAlign
            ? { width: chart.width - padding.X * NUMBER_OF_BOTH_SIDES, height: itemHeight }
            : {
                width: initialWidth,
                height: chart.height - restAreaHeight,
            };
    }
    function getNestedPieLegendLabelsInfo(series, legendInfo) {
        const result = [];
        const maxTextLengthWithEllipsis = getMaxTextLengthWithEllipsis(legendInfo);
        series.pie.forEach(({ data }) => {
            data.forEach(({ name, parentName, visible }) => {
                if (!parentName) {
                    const { width, viewLabel } = getViewLabelInfo(legendInfo, name, maxTextLengthWithEllipsis);
                    result.push({
                        label: name,
                        type: 'pie',
                        checked: (visible !== null && visible !== void 0 ? visible : true),
                        viewLabel,
                        width,
                    });
                }
            });
        });
        return result;
    }
    function getMaxTextLengthWithEllipsis(legendInfo) {
        var _a, _b;
        const { legendOptions, font, checkboxVisible } = legendInfo;
        const width = (_b = (_a = legendOptions) === null || _a === void 0 ? void 0 : _a.item) === null || _b === void 0 ? void 0 : _b.width;
        if (isUndefined(width)) {
            return;
        }
        const checkboxWidth = checkboxVisible ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0;
        const iconWidth = LEGEND_ICON_SIZE + LEGEND_MARGIN_X;
        const ellipsisDotWidth = getTextWidth(ELLIPSIS_DOT_TEXT, font);
        const widestTextWidth = getTextWidth(WIDEST_TEXT, font);
        const maxTextCount = Math.floor((width - ellipsisDotWidth - checkboxWidth - iconWidth) / widestTextWidth);
        return maxTextCount > 0 ? maxTextCount : 0;
    }
    function getViewLabelInfo(legendInfo, label, maxTextLength) {
        var _a, _b;
        const { checkboxVisible, useSpectrumLegend, font, legendOptions } = legendInfo;
        let viewLabel = label;
        const itemWidth = (_b = (_a = legendOptions) === null || _a === void 0 ? void 0 : _a.item) === null || _b === void 0 ? void 0 : _b.width;
        const itemWidthWithFullText = getItemWidth(viewLabel, checkboxVisible, useSpectrumLegend, font);
        if (isNumber(itemWidth) && isNumber(maxTextLength) && itemWidth < itemWidthWithFullText) {
            viewLabel = `${label.slice(0, maxTextLength)}${ELLIPSIS_DOT_TEXT}`;
        }
        return { viewLabel, width: (itemWidth !== null && itemWidth !== void 0 ? itemWidth : itemWidthWithFullText) };
    }
    function getLegendLabelsInfo(series, legendInfo, categories) {
        const maxTextLengthWithEllipsis = getMaxTextLengthWithEllipsis(legendInfo);
        let colorIndex = 0;
        return Object.keys(series).flatMap((type) => {
            const labelInfo = series[type].map(({ name, colorValue, visible, colorByCategories }) => {
                const label = colorValue ? colorValue : name;
                const currentColorIndex = colorIndex;
                const { width, viewLabel } = getViewLabelInfo(legendInfo, label, maxTextLengthWithEllipsis);
                colorIndex += colorByCategories ? categories.length : 1;
                return {
                    label,
                    type,
                    colorByCategories: !!colorByCategories,
                    colorIndex: currentColorIndex,
                    checked: (visible !== null && visible !== void 0 ? visible : true),
                    viewLabel,
                    width,
                };
            });
            colorIndex += series[type].length - 1;
            return labelInfo;
        });
    }
    function getItemWidth(label, checkboxVisible, useSpectrumLegend, font) {
        return ((useSpectrumLegend
            ? 0
            : (checkboxVisible ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0) +
                LEGEND_ICON_SIZE +
                LEGEND_MARGIN_X) + getTextWidth(label, font));
    }
    function getLegendDataAppliedTheme(data, series) {
        const colors = Object.values(series).reduce((acc, cur) => (cur && cur.colors ? [...acc, ...cur.colors] : acc), []);
        const hasColorByCategories = data.some((legend) => legend.colorByCategories);
        return data.map((datum, idx) => {
            const { colorByCategories, colorIndex } = datum;
            const index = hasColorByCategories ? colorIndex || idx : idx;
            return Object.assign(Object.assign({}, datum), { color: colorByCategories ? '#aaa' : colors[index % colors.length] });
        });
    }
    function getLegendState(options, series, categories) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const useSpectrumLegend = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.useColorValue, (_c !== null && _c !== void 0 ? _c : !!series.heatmap));
        const useScatterChartIcon = !!((_d = series) === null || _d === void 0 ? void 0 : _d.scatter);
        const checkboxVisible = useSpectrumLegend
            ? false
            : showCheckbox(options);
        const defaultTheme = makeDefaultTheme(series, (_g = (_f = (_e = options) === null || _e === void 0 ? void 0 : _e.theme) === null || _f === void 0 ? void 0 : _f.chart) === null || _g === void 0 ? void 0 : _g.fontFamily);
        const font = getTitleFontString(deepMergedCopy(defaultTheme.legend.label, Object.assign({}, (_j = (_h = options.theme) === null || _h === void 0 ? void 0 : _h.legend) === null || _j === void 0 ? void 0 : _j.label)));
        const legendInfo = {
            checkboxVisible,
            font,
            useSpectrumLegend,
            legendOptions: options.legend,
        };
        const legendLabelsInfo = hasNestedPieSeries(series)
            ? getNestedPieLegendLabelsInfo(series, legendInfo)
            : getLegendLabelsInfo(series, legendInfo, categories);
        const data = legendLabelsInfo.map(({ label, type, checked, width, viewLabel, colorByCategories, colorIndex }) => ({
            label,
            active: true,
            checked,
            width,
            iconType: getIconType(type),
            chartType: type,
            rowIndex: 0,
            columnIndex: 0,
            viewLabel,
            colorByCategories,
            colorIndex,
        }));
        return {
            useSpectrumLegend,
            useScatterChartIcon,
            data,
        };
    }
    function getNextColumnRowIndex(params) {
        const { verticalAlign, columnCount, rowCount, legendCount } = params;
        let { rowIndex, columnIndex } = params;
        if (verticalAlign) {
            const maxLen = legendCount / rowCount;
            if (maxLen - 1 > columnIndex) {
                columnIndex += 1;
            }
            else {
                rowIndex += 1;
                columnIndex = 0;
            }
        }
        else {
            const maxLen = legendCount / columnCount;
            if (maxLen - 1 > rowIndex) {
                rowIndex += 1;
            }
            else {
                columnIndex += 1;
                rowIndex = 0;
            }
        }
        return [rowIndex, columnIndex];
    }
    function setIndexToLegendData(legendData, rowCount, columnCount, legendCount, verticalAlign) {
        let columnIndex = 0;
        let rowIndex = 0;
        legendData.forEach((datum) => {
            datum.rowIndex = rowIndex;
            datum.columnIndex = columnIndex;
            [rowIndex, columnIndex] = getNextColumnRowIndex({
                rowCount,
                columnCount,
                verticalAlign,
                legendCount,
                rowIndex,
                columnIndex,
            });
        });
    }
    const legend = {
        name: 'legend',
        state: ({ options, series, categories }) => {
            return {
                legend: getLegendState(options, series, categories),
                circleLegend: {},
            };
        },
        action: {
            initLegendState({ state, initStoreState }) {
                extend(state.legend, getLegendState(initStoreState.options, initStoreState.series, initStoreState.categories));
            },
            setLegendLayout({ state }) {
                if (state.legend.useSpectrumLegend) {
                    this.dispatch('setSpectrumLegendLayout');
                }
                else {
                    this.dispatch('setNormalLegendLayout');
                }
            },
            setSpectrumLegendLayout({ state }) {
                const { legend: { data: legendData }, series, options, chart, theme, } = state;
                const align = getLegendAlign(options);
                const visible = showLegend(options, series);
                const verticalAlign = isVerticalAlign(align);
                const legendWidths = legendData.map(({ width }) => width);
                const itemHeight = getLegendItemHeight(theme.legend.label.fontSize);
                const width = getSpectrumLegendWidth(legendWidths, chart.width, verticalAlign);
                const height = getSpectrumLegendHeight(itemHeight, chart.height, verticalAlign);
                extend(state.legend, { visible, align, width, height });
            },
            setNormalLegendLayout({ state, initStoreState }) {
                const { legend: { data: legendData }, series, options, chart, theme, } = state;
                const align = getLegendAlign(options);
                const visible = showLegend(options, series);
                const checkbox = showCheckbox(options);
                const initialWidth = Math.min(chart.width / 5, INITIAL_LEGEND_WIDTH);
                const verticalAlign = isVerticalAlign(align);
                const isNestedPieChart = hasNestedPieSeries(initStoreState.series);
                const isScatterChart = !!series.scatter;
                const isBubbleChart = !!series.bubble;
                const circleLegendVisible = isBubbleChart
                    ? showCircleLegend(options)
                    : false;
                const legendWidths = legendData.map(({ width }) => width);
                const itemHeight = getLegendItemHeight(theme.legend.label.fontSize);
                const { legendWidth, legendHeight, rowCount, columnCount } = calculateLegendSize({
                    initialWidth,
                    legendWidths,
                    options,
                    verticalAlign,
                    visible,
                    checkbox,
                    chart,
                    itemHeight,
                    circleLegendVisible,
                });
                setIndexToLegendData(legendData, rowCount, columnCount, legendWidths.length, verticalAlign);
                extend(state.legend, {
                    visible,
                    align,
                    showCheckbox: checkbox,
                    width: legendWidth,
                    height: legendHeight,
                });
                if (isBubbleChart && circleLegendVisible) {
                    this.dispatch('updateCircleLegendLayout', { legendWidth });
                }
                if (!isNestedPieChart && !isNoData(series)) {
                    this.dispatch('updateLegendColor');
                }
                if (isScatterChart) {
                    this.dispatch('updateLegendIcon');
                }
            },
            updateCircleLegendLayout({ state }, { legendWidth }) {
                const width = legendWidth === 0
                    ? INITIAL_CIRCLE_LEGEND_WIDTH
                    : Math.min(legendWidth, INITIAL_CIRCLE_LEGEND_WIDTH);
                const radius = Math.max((width - LEGEND_MARGIN_X) / 2, 0);
                extend(state.circleLegend, { visible: true, width, radius });
            },
            setLegendActiveState({ state }, { name, active }) {
                const { data } = state.legend;
                const model = data.find(({ label }) => label === name);
                model.active = active;
                this.notify(state, 'legend');
            },
            setAllLegendActiveState({ state }, active) {
                state.legend.data.forEach((datum) => {
                    datum.active = active;
                });
                this.notify(state, 'legend');
            },
            setLegendCheckedState({ state }, { name, checked }) {
                const model = state.legend.data.find(({ label }) => label === name);
                model.checked = checked;
                this.notify(state, 'legend');
            },
            updateLegendColor({ state }) {
                const { legend: legendData, series } = state;
                const data = getLegendDataAppliedTheme(legendData.data, series);
                extend(state.legend, { data });
            },
            updateLegendIcon({ state }) {
                const { legend: legendData, series } = state;
                const data = legendData.data.reduce((acc, cur) => {
                    var _a;
                    if (cur.chartType === 'scatter' && ((_a = series.scatter) === null || _a === void 0 ? void 0 : _a.data)) {
                        const model = series.scatter.data.find(({ name }) => name === cur.label);
                        const iconType = model ? model.iconType : cur.iconType;
                        return [...acc, Object.assign(Object.assign({}, cur), { iconType })];
                    }
                    return [...acc, cur];
                }, []);
                extend(state.legend, { data });
            },
            updateNestedPieChartLegend({ state }) {
                const { legend: legendData, nestedPieSeries } = state;
                extend(state.legend, {
                    data: getLegendDataAppliedTheme(legendData.data, nestedPieSeries),
                });
            },
        },
        observe: {
            updateLegendLayout() {
                this.dispatch('setLegendLayout');
            },
        },
    };
    var legend$1 = legend;

    function getOptionsBySize(size, options) {
        var _a;
        const rules = (_a = options.responsive) === null || _a === void 0 ? void 0 : _a.rules;
        return Array.isArray(rules)
            ? rules.reduce((acc, cur) => {
                return cur.condition(size) ? deepMergedCopy(acc, cur.options) : acc;
            }, options)
            : options;
    }
    function getSize(usingContainerSize, containerSize, chartSize) {
        var _a, _b;
        const { width: usingContainerWidth, height: usingContainerHeight } = usingContainerSize;
        return {
            width: usingContainerWidth ? containerSize.width : (_a = chartSize) === null || _a === void 0 ? void 0 : _a.width,
            height: usingContainerHeight ? containerSize.height : (_b = chartSize) === null || _b === void 0 ? void 0 : _b.height,
        };
    }
    const optionsData = {
        name: 'options',
        state: ({ options }) => ({
            originalOptions: deepCopy(options),
            options,
        }),
        action: {
            setOptions({ state }) {
                const { width, height } = state.chart;
                if (width < 0 || height < 0) {
                    return;
                }
                state.options = getOptionsBySize({ width, height }, state.originalOptions);
            },
            initOptions({ initStoreState, state }, { options, containerSize }) {
                initStoreState.options = options;
                state.originalOptions = deepCopy(options);
                const { usingContainerSize, originalOptions } = state;
                const size = getSize(usingContainerSize, containerSize, {
                    width: originalOptions.chart.width,
                    height: originalOptions.chart.height,
                });
                this.dispatch('setChartSize', size);
            },
            updateOptions({ state, initStoreState }, { options, containerSize }) {
                var _a, _b;
                initStoreState.options = deepMergedCopy(initStoreState.options, options);
                state.originalOptions = deepMergedCopy(state.originalOptions, options);
                const { usingContainerSize, originalOptions } = state;
                const size = getSize(usingContainerSize, containerSize, {
                    width: (_a = originalOptions.chart) === null || _a === void 0 ? void 0 : _a.width,
                    height: (_b = originalOptions.chart) === null || _b === void 0 ? void 0 : _b.height,
                });
                this.dispatch('setChartSize', size);
                this.dispatch('initThemeState');
            },
        },
        observe: {
            updateOptions() {
                this.dispatch('setOptions');
            },
        },
    };
    var optionsStore = optionsData;

    function getCommonSeriesOptions(options, series, isNestedPieChart) {
        var _a, _b;
        const theme = (_a = options) === null || _a === void 0 ? void 0 : _a.theme;
        if (!((_b = theme) === null || _b === void 0 ? void 0 : _b.series)) {
            return {};
        }
        const seriesNames = isNestedPieChart ? getNestedPieChartAliasNames(series) : Object.keys(series);
        return seriesNames.reduce((acc, seriesName) => {
            delete acc[seriesName];
            return acc;
        }, Object.assign({}, theme.series));
    }
    function getThemeAppliedSecondaryYAxis(options) {
        var _a, _b, _c;
        const theme = Object.assign({}, options.theme);
        if (!Array.isArray(theme.yAxis)) {
            return theme;
        }
        const axisTitleTheme = makeAxisTitleTheme((_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.theme) === null || _b === void 0 ? void 0 : _b.chart) === null || _c === void 0 ? void 0 : _c.fontFamily);
        const yAxis = theme.yAxis.map((yAxisTheme) => deepMergedCopy({ title: Object.assign({}, axisTitleTheme) }, Object.assign({}, yAxisTheme)));
        return Object.assign(Object.assign({}, theme), { yAxis });
    }
    function getThemeOptionsWithSeriesName(options, series, commonSeriesOptions, isNestedPieChart) {
        var _a;
        const theme = getThemeAppliedSecondaryYAxis(options);
        if (!((_a = theme) === null || _a === void 0 ? void 0 : _a.series)) {
            return Object.assign({}, theme);
        }
        const seriesTheme = Object.assign(Object.assign({}, theme), { series: {} });
        const seriesNames = Object.keys(series);
        const isComboChart = seriesNames.length > 1;
        if (isNestedPieChart) {
            const aliasNames = getNestedPieChartAliasNames(series);
            seriesTheme.series = {
                pie: aliasNames.reduce((acc, aliasName) => {
                    var _a;
                    return (Object.assign(Object.assign({}, acc), { [aliasName]: deepMergedCopy((_a = theme.series) === null || _a === void 0 ? void 0 : _a[aliasName], omit(commonSeriesOptions, 'colors')) }));
                }, {}),
            };
        }
        else if (isComboChart) {
            seriesTheme.series = Object.assign({}, seriesNames.reduce((acc, seriesName) => {
                var _a;
                return (Object.assign(Object.assign({}, acc), { [seriesName]: deepMergedCopy((_a = theme.series) === null || _a === void 0 ? void 0 : _a[seriesName], omit(commonSeriesOptions, 'colors')) }));
            }, {}));
        }
        else {
            seriesTheme.series = {
                [seriesNames[0]]: theme.series,
            };
        }
        return seriesTheme;
    }
    function setColors(theme, series, commonSeriesOptions, isNestedPieChart, categories) {
        var _a, _b;
        let index = 0;
        const commonColorsOption = [
            ...(_b = (_a = commonSeriesOptions) === null || _a === void 0 ? void 0 : _a.colors, (_b !== null && _b !== void 0 ? _b : [])),
            ...defaultSeriesTheme.colors,
        ];
        const themeNames = isNestedPieChart ? getNestedPieChartAliasNames(series) : Object.keys(series);
        themeNames.forEach((name, idx) => {
            var _a;
            const themeSeries = series[name] || [];
            const filteredSeries = themeSeries.filter((chartSeries) => chartSeries.colorByCategories);
            const hasColorByCategories = filteredSeries.length > 0;
            let size;
            if (isNestedPieChart) {
                size = series.pie[idx].data.length;
            }
            else if (hasColorByCategories) {
                const rejectedSeries = themeSeries.filter((chartSeries) => !chartSeries.colorByCategories);
                size = rejectedSeries.length + categories.length;
            }
            else {
                size = series[name].length;
            }
            const target = isNestedPieChart ? theme.series.pie : theme.series;
            if (!((_a = target[name]) === null || _a === void 0 ? void 0 : _a.colors)) {
                target[name] = Object.assign(Object.assign({}, target[name]), { colors: commonColorsOption.slice(index, index + size) });
                index += size;
            }
        });
    }
    function setPlot(theme) {
        ['vertical', 'horizontal'].reduce((acc, cur) => {
            if (!acc[cur]) {
                acc[cur] = { lineColor: acc.lineColor };
            }
            return acc;
        }, theme.plot);
    }
    function checkAnchorPieSeriesOption(options, series, alias) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return {
            hasOuterAnchor: !!series.pie && ((_d = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b[alias]) === null || _c === void 0 ? void 0 : _c.dataLabels) === null || _d === void 0 ? void 0 : _d.anchor) === 'outer',
            hasOuterAnchorPieSeriesName: !!series.pie && ((_j = (_h = (_g = (_f = (_e = options) === null || _e === void 0 ? void 0 : _e.series) === null || _f === void 0 ? void 0 : _f[alias]) === null || _g === void 0 ? void 0 : _g.dataLabels) === null || _h === void 0 ? void 0 : _h.pieSeriesName) === null || _j === void 0 ? void 0 : _j.anchor) === 'outer',
        };
    }
    function getTheme(options, series, categories) {
        var _a, _b, _c;
        const isNestedPieChart = hasNestedPieSeries(series);
        const commonSeriesOptions = getCommonSeriesOptions(options, series, isNestedPieChart);
        let pieSeriesOuterAnchors = {
            hasOuterAnchor: hasOuterDataLabel(options, series),
            hasOuterAnchorPieSeriesName: hasOuterPieSeriesName(options, series),
        };
        if (isNestedPieChart) {
            const aliasNames = getNestedPieChartAliasNames(series);
            pieSeriesOuterAnchors = aliasNames.reduce((acc, cur) => (Object.assign(Object.assign({}, acc), { [cur]: checkAnchorPieSeriesOption(options, series, cur) })), {});
        }
        const globalFontFamily = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.theme) === null || _b === void 0 ? void 0 : _b.chart) === null || _c === void 0 ? void 0 : _c.fontFamily;
        const theme = deepMergedCopy(getDefaultTheme(series, pieSeriesOuterAnchors, globalFontFamily, isNestedPieChart), getThemeOptionsWithSeriesName(options, series, commonSeriesOptions, isNestedPieChart));
        if (!series.heatmap) {
            setColors(theme, series, commonSeriesOptions, isNestedPieChart, categories);
        }
        setPlot(theme);
        return theme;
    }
    const theme = {
        name: 'theme',
        state: ({ options, series, categories }) => ({
            theme: getTheme(options, series, categories),
        }),
        action: {
            initThemeState({ state, initStoreState }) {
                state.theme = getTheme(state.options, initStoreState.series, initStoreState.categories);
            },
        },
        observe: {
            updateTheme() {
                this.dispatch('initThemeState');
            },
        },
    };
    var theme$1 = theme;

    class EventEmitter {
        constructor() {
            this.handlers = [];
        }
        on(type, handler) {
            if (!this.handlers[type]) {
                this.handlers[type] = [];
            }
            this.handlers[type].push(handler);
        }
        emit(type, ...args) {
            var _a;
            (_a = this.handlers[type]) === null || _a === void 0 ? void 0 : _a.forEach((handler) => handler(...args));
        }
    }

    class ComponentManager {
        constructor({ store, eventBus }) {
            this.components = [];
            this.store = store;
            this.eventBus = eventBus;
        }
        add(ComponentCtor, initialParam) {
            const component = new ComponentCtor({
                store: this.store,
                eventBus: this.eventBus,
            });
            if (component.initialize) {
                component.initialize(initialParam);
            }
            let proc = (...args) => {
                component.render(args[0], args[1]); // rest쓰면 에러남
                component.sync();
                this.eventBus.emit('needLoop');
            };
            this.store.observe((...args) => {
                proc(...args);
            });
            proc = debounce(proc);
            this.components.push(component);
        }
        remove(ComponentCtor) {
            this.components = this.components.filter((component) => !(component instanceof ComponentCtor));
        }
        clear() {
            this.components = [];
            this.eventBus.emit('needDraw');
        }
        invoke(method, params) {
            this.components.forEach((component) => {
                const fn = component[method];
                if (fn) {
                    fn.call(component, params);
                }
            });
        }
        forEach(iteratee) {
            this.components.forEach(iteratee);
        }
    }

    class Painter {
        constructor(chart) {
            this.width = 0;
            this.height = 0;
            this.brushes = {};
            this.chart = chart;
        }
        showUnsupportedCanvasFeatureError() {
            if (!this.ctx.setLineDash) {
                console.warn(message.DASH_SEGMENTS_UNAVAILABLE_ERROR);
            }
        }
        setup() {
            const { height, width } = this.chart.store.state.chart;
            if (!this.canvas) {
                const canvas = document.createElement('canvas');
                this.canvas = canvas;
                this.chart.el.appendChild(canvas);
                canvas.addEventListener('click', this.chart);
                canvas.addEventListener('mousemove', this.chart);
                canvas.addEventListener('mousedown', this.chart);
                canvas.addEventListener('mouseup', this.chart);
                canvas.addEventListener('mouseout', this.chart);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    this.ctx = ctx;
                }
            }
            this.setSize(width, height);
            this.showUnsupportedCanvasFeatureError();
        }
        setSize(width, height) {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            let ratio = 1;
            if ('deviceXDPI' in window.screen) {
                // IE mobile or IE
                ratio =
                    window.screen.deviceXDPI /
                        window.screen.logicalXDPI;
            }
            else if (window.hasOwnProperty('devicePixelRatio')) {
                ratio = window.devicePixelRatio;
            }
            this.width = width * ratio || 0;
            this.height = height * ratio || 0;
            this.scaleCanvasRatio(ratio);
        }
        scaleCanvasRatio(ratio) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.ctx.scale(ratio, ratio);
        }
        add(name, brush) {
            this.brushes[name] = brush;
        }
        addGroups(groups) {
            groups.forEach((group) => {
                Object.keys(group).forEach((key) => {
                    this.add(key, group[key]);
                });
            });
        }
        paint(name, brushModel) {
            if (this.brushes[name]) {
                this.brushes[name](this.ctx, brushModel);
            }
            else {
                throw new Error(message.noBrushError(name));
            }
        }
        paintForEach(brushModels) {
            brushModels.forEach((m) => this.paint(m.type, m));
        }
        beforeFrame() {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'transparent';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
        beforeDraw(transX, transY) {
            this.ctx.save();
            this.ctx.translate(transX, transY);
        }
        afterDraw() {
            this.ctx.restore();
        }
    }

    class Animator {
        constructor() {
            this.anims = [];
            this.state = 'IDLE';
            this.requestId = null;
            this.firstRendering = true;
        }
        add({ chart, duration, requester, onCompleted = () => { }, onFrame = (delta) => {
            if (!this.firstRendering) {
                chart.update(delta);
            }
            if (this.firstRendering) {
                chart.initUpdate(delta);
                if (delta === 1) {
                    this.firstRendering = false;
                }
            }
        }, }) {
            if (this.anims.length) {
                this.reset();
            }
            if (this.state === 'IDLE') {
                this.anims.push({
                    chart,
                    requester,
                    duration,
                    onFrame,
                    onCompleted,
                    start: null,
                    current: null,
                    completed: false,
                });
                this.start();
            }
        }
        reset() {
            this.anims.forEach((anim) => {
                anim.current = 1;
                anim.onFrame(anim.current);
                anim.completed = true;
            });
            this.anims = [];
            this.cancelAnimFrame();
            this.state = 'IDLE';
            this.requestId = null;
        }
        start() {
            if (this.anims.length) {
                this.state = 'RUNNING';
                this.runFrame();
            }
        }
        runFrame() {
            this.requestId = window.requestAnimationFrame((timestamp) => {
                this.runAnims(timestamp);
            });
        }
        runAnims(timestamp) {
            this.next(timestamp);
            if (this.anims.length) {
                this.runFrame();
            }
            else {
                this.state = 'IDLE';
                this.requestId = null;
            }
        }
        next(timestamp) {
            this.anims.forEach((anim) => {
                if (isNull(anim.start)) {
                    anim.start = timestamp;
                }
                Object.defineProperty(anim.chart, '___animId___', {
                    value: timestamp,
                    enumerable: false,
                    writable: false,
                    configurable: true,
                });
                anim.current = anim.duration ? Math.min((timestamp - anim.start) / anim.duration, 1) : 1;
                anim.onFrame(anim.current);
                anim.completed = anim.current === 1;
            });
            this.anims.forEach((anim) => {
                if (anim.chart.___animId___ === timestamp) {
                    anim.chart.draw();
                    delete anim.chart.___animId___;
                }
                if (anim.completed) {
                    this.cancelAnimFrame();
                    anim.onCompleted();
                    anim.chart.eventBus.emit('animationCompleted', anim.requester);
                }
            });
            this.anims = this.anims.filter((anim) => !anim.completed);
        }
        cancelAnimFrame() {
            if (this.requestId) {
                window.cancelAnimationFrame(this.requestId);
            }
        }
    }

    function withinRotationRect({ slope, yIntercept, mouseX, mouseY, modelXPositions, compX, compY, detectionSize = 0, }) {
        const [x1, x2] = modelXPositions;
        const posY = slope * (mouseX - compX) + yIntercept;
        const withinRadius = (x1 > x2 && mouseX >= compX + x2 && mouseX <= compX + x1) ||
            (x1 < x2 && mouseX <= compX + x2 && mouseX >= compX + x1);
        const withinDetectionSize = posY - detectionSize + compY <= mouseY && mouseY <= posY + detectionSize + compY;
        return withinRadius && withinDetectionSize;
    }
    const responderDetectors = {
        circle: (mousePosition, model, componentRect) => {
            const { x, y } = mousePosition;
            const { x: modelX, y: modelY, radius, detectionSize } = model;
            const { x: compX, y: compY } = componentRect;
            const radiusAdjustment = isUndefined(detectionSize) ? 10 : detectionSize;
            return (Math.pow((x - (modelX + compX)), 2) + Math.pow((y - (modelY + compY)), 2) < Math.pow((radius + radiusAdjustment), 2));
        },
        rect: (mousePosition, model, componentRect = { x: 0, y: 0, width: 0, height: 0 }) => {
            const { x, y } = mousePosition;
            const { x: modelX, y: modelY, width, height } = model;
            const { x: compX, y: compY } = componentRect;
            return (x >= modelX + compX &&
                x <= modelX + compX + width &&
                y >= modelY + compY &&
                y <= modelY + compY + height);
        },
        sector: (mousePosition, model, componentRect = { x: 0, y: 0, width: 0, height: 0 }) => {
            const { x, y } = mousePosition;
            const { x: modelX, y: modelY, radius: { outer, inner }, degree: { start, end }, drawingStartAngle, clockwise, } = model;
            const { x: compX, y: compY } = componentRect;
            const xPos = x - (modelX + compX);
            const yPos = y - (modelY + compY);
            const insideOuterRadius = Math.pow(xPos, 2) + Math.pow(yPos, 2) < Math.pow(outer, 2);
            const outsideInnerRadius = Math.pow(xPos, 2) + Math.pow(yPos, 2) > Math.pow(inner, 2);
            const withinRadius = insideOuterRadius && outsideInnerRadius;
            const detectionDegree = calculateRadianToDegree(Math.atan2(yPos, xPos), drawingStartAngle);
            return withinRadius && withinRadian(clockwise, start, end, detectionDegree);
        },
        line: (mousePosition, model, componentRect = { x: 0, y: 0, width: 0, height: 0 }) => {
            const { x, y } = mousePosition;
            const { x: compX, y: compY } = componentRect;
            const { x: modelX, y: modelY, x2, y2, detectionSize = 3 } = model;
            const numerator = y2 - modelY;
            const denominator = x2 - modelX;
            let withinLine = false;
            if (numerator === 0) {
                const minX = Math.min(modelX, x2);
                const maxX = Math.max(modelX, x2);
                withinLine =
                    x - compX >= minX &&
                        x - compX <= maxX &&
                        y >= modelY + compY - detectionSize &&
                        y <= modelY + compY + detectionSize;
            }
            else if (denominator === 0) {
                const minY = Math.min(modelY, y2);
                const maxY = Math.max(modelY, y2);
                withinLine =
                    y - compY >= minY &&
                        y - compY <= maxY &&
                        x >= modelX + compX - detectionSize &&
                        x <= modelX + compX + detectionSize;
            }
            else {
                const slope = numerator / denominator;
                const xPos = x - (modelX + compX);
                const yPos = y - (modelY + compY);
                withinLine = slope * xPos === yPos;
            }
            return withinLine;
        },
        boxPlot: (mousePosition, model, componentRect = { x: 0, y: 0, width: 0, height: 0 }) => {
            return ['rect', 'median', 'minimum', 'maximum', 'upperWhisker', 'lowerWhisker'].some((prop) => {
                if (!model[prop]) {
                    return false;
                }
                return prop === 'rect'
                    ? responderDetectors.rect(mousePosition, model[prop], componentRect)
                    : responderDetectors.line(mousePosition, model[prop], componentRect);
            });
        },
        clockHand: (mousePosition, model, componentRect = { x: 0, y: 0, width: 0, height: 0 }) => {
            const { x, y } = mousePosition;
            const { x: compX, y: compY } = componentRect;
            const { x: centerX, y: centerY, x2, y2, detectionSize = 5 } = model;
            const numerator = y2 - centerY;
            const denominator = x2 - centerX;
            let withinClockHand = false;
            if (numerator === 0) {
                const minX = Math.min(centerX, x2);
                const maxX = Math.max(centerX, x2);
                withinClockHand =
                    x - compX >= minX &&
                        x - compX <= maxX &&
                        y >= centerY + compY - detectionSize &&
                        y <= centerY + compY + detectionSize;
            }
            else if (denominator === 0) {
                const minY = Math.min(centerY, y2);
                const maxY = Math.max(centerY, y2);
                withinClockHand =
                    y - compY >= minY &&
                        y - compY <= maxY &&
                        x >= centerX + compX - detectionSize &&
                        x <= centerX + compX + detectionSize;
            }
            else {
                const slope = numerator / denominator;
                const yIntercept = centerY - slope * centerX;
                withinClockHand = withinRotationRect({
                    slope,
                    yIntercept,
                    mouseX: x,
                    mouseY: y,
                    modelXPositions: [centerX, x2],
                    compX,
                    compY,
                    detectionSize,
                });
            }
            return withinClockHand;
        },
    };

    const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
    function isExpired(date) {
        const now = new Date().getTime();
        return now - date > MS_7_DAYS;
    }
    function imagePing(url, trackingInfo) {
        const queryString = Object.keys(trackingInfo)
            .map((id, index) => `${index ? '&' : ''}${id}=${trackingInfo[id]}`)
            .join('');
        const trackingElement = document.createElement('img');
        trackingElement.src = `${url}?${queryString}`;
        trackingElement.style.display = 'none';
        document.body.appendChild(trackingElement);
        document.body.removeChild(trackingElement);
        return trackingElement;
    }
    function sendHostname() {
        const hostname = location.hostname;
        const applicationKeyForStorage = `TOAST UI chart for ${hostname}: Statistics`;
        const date = window.localStorage.getItem(applicationKeyForStorage);
        if (date && !isExpired(Number(date))) {
            return;
        }
        window.localStorage.setItem(applicationKeyForStorage, String(new Date().getTime()));
        setTimeout(() => {
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                imagePing('https://www.google-analytics.com/collect', {
                    v: 1,
                    t: 'event',
                    tid: 'UA-129983528-2',
                    cid: hostname,
                    dp: hostname,
                    dh: 'chart',
                    el: 'chart',
                    ec: 'use',
                });
            }
        }, 1000);
    }

    const DEFAULT_ANIM_DURATION = 500;
    function getUsingContainerSize(eventName, usingContainerSize, width, height) {
        const { width: usingContainerWidth, height: usingContainerHeight } = usingContainerSize;
        const isAutoWidth = isAutoValue(width);
        const isAutoHeight = isAutoValue(height);
        return eventName === 'updateOptions'
            ? {
                width: !isUndefined(width) && usingContainerWidth !== isAutoWidth
                    ? isAutoWidth
                    : usingContainerWidth,
                height: !isUndefined(height) && usingContainerHeight !== isAutoHeight
                    ? isAutoHeight
                    : usingContainerHeight,
            }
            : {
                width: isAutoWidth,
                height: isAutoHeight,
            };
    }
    /**
     * @class
     * @abstract
     * Abstract class used to implement each chart.
     */
    class Chart$1 {
        constructor(props) {
            var _a, _b, _c, _d;
            this.___animId___ = null;
            this.painter = new Painter(this);
            this.eventBus = new EventEmitter();
            this.enteredComponents = [];
            this.animationControlFlag = {
                resizing: false,
                updating: false,
            };
            this.resizeObserver = null;
            this.debounceResizeEvent = debounce(() => {
                const { offsetWidth, offsetHeight } = this.containerEl;
                this.resizeChartSize(offsetWidth, offsetHeight);
            }, 100);
            /**
             * Get checked legend chart type and label, checked state.
             * @returns {Array<{checked: boolean, chartType: string, label: string}>} Array data that whether series has checked
             * @api
             * @example
             * const checkedLegend = chart.getCheckedLegend()
             */
            this.getCheckedLegend = () => {
                const { data } = this.store.state.legend;
                return data
                    .filter((datum) => datum.checked)
                    .map((datum) => pick(datum, 'chartType', 'label', 'checked'));
            };
            /**
             * Returns the currently applied chart options.
             * @returns {Object} options
             * @api
             * @example
             * const options = chart.getOptions();
             */
            this.getOptions = () => {
                return makeObservableObjectToNormal(this.store.initStoreState.options);
            };
            /**
             * Register of user custom event.
             * @param {string} eventName - Event name. 'clickLegendLabel', 'clickLegendCheckbox', 'selectSeries', 'unselectSeries', 'hoverSeries', 'unhoverSeries', 'zoom', 'resetZoom' is available.
             * @param {Function} handler - Event handler
             * @api
             */
            this.on = (eventName, handler) => {
                /**
                 * Register Events that occur when click legend label
                 * @event ChartBase#clickLegendLabel
                 * @param {object} info selected legend information
                 * @api
                 * @example
                 * chart.on('clickLegendLabel', (info) => {
                 *   console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when click legend checkbox
                 * @event ChartBase#clickLegendCheckbox
                 * @param {object} info selected legend info
                 * @api
                 * @example
                 * chart.on('clickLegendCheckbox', (info) => {
                 *   console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when select series
                 * @event ChartBase#selectSeries
                 * @param {object} info selected series info
                 * @api
                 * @example
                 * chart.on('selectSeries', (info) => {
                 *   console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when unselect series
                 * @event ChartBase#unselectSeries
                 * @param {object} info unselected series info
                 * @api
                 * @example
                 * chart.on('unselectSeries', (info) => {
                 *   console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when hover to series
                 * @event ChartBase#hoverSeries
                 * @param {object} info hovered series info
                 * @api
                 * @example
                 * chart.on('hoverSeries', (info) => {
                 *   console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when unhover from series
                 * @event ChartBase#unhoverSeries
                 * @param {object} info unhovered series info
                 * @api
                 * @example
                 * chart.on('unhoverSeries', (info) => {
                 *  console.log(info);
                 * });
                 */
                /**
                 * Register Events that occur when zooming
                 * @event ChartBase#zoom
                 * @param {string[]} dataRange - []
                 * @api
                 * @example
                 * chart.on('zoom', (dataRange) => {
                 *    console.log(dataRange);
                 * });
                 */
                /**
                 * Register Events that occur when zoom is reset
                 * @event ChartBase#resetZoom
                 * @api
                 * @example
                 * chart.on('resetZoom', () => {});
                 */
                this.eventBus.on(eventName, handler);
            };
            /**
             * Destroys the instance.
             * @api
             * @example
             * chart.destroy();
             */
            this.destroy = () => {
                this.componentManager.clear();
                this.clearResizeEvent();
                this.containerEl.innerHTML = '';
            };
            /**
             * Select series. It works only when the selectable option is true.
             * @param {Object} seriesInfo - Information of the series to be selected
             *      @param {number} [seriesInfo.seriesIndex] - Index of series
             *      @param {number} [seriesInfo.index] - Index of data within series
             *      @param {string} [seriesInfo.name] - Specify name for NestedPie Chart
             *      @param {string} [seriesInfo.chartType] - Specify which chart to select when using LineArea, LineScatter, and ColumnLine charts.specifies which chart to select when using LineArea, LineScatter, and ColumnLine charts.
             * @api
             * @example
             * chart.selectSeries({index: 1, seriesIndex: 2});
             */
            this.selectSeries = (seriesInfo) => {
                if (!this.isSelectableSeries()) {
                    throw new Error(message.SELECT_SERIES_API_SELECTABLE_ERROR);
                }
                this.eventBus.emit('selectSeries', Object.assign(Object.assign({}, seriesInfo), { state: this.store.state }));
            };
            /**
             * Unselect selected series. It works only when the selectable option is true.
             * @api
             * @example
             * chart.unselectSeries();
             */
            this.unselectSeries = () => {
                if (!this.isSelectableSeries()) {
                    throw new Error(message.SELECT_SERIES_API_SELECTABLE_ERROR);
                }
                this.store.dispatch('setAllLegendActiveState', true);
                this.eventBus.emit('resetSelectedSeries');
            };
            /**
             * Resize chart size.
             * @param {Object} size Chart size
             *   @param {number} [size.width] Width
             *   @param {number} [size.height] Height
             * @api
             * @example
             * chart.resize({height: 100, width: 200});
             */
            this.resize = (size) => {
                this.resetSeries();
                this.dispatchOptionsEvent('updateOptions', { chart: Object.assign({}, size) });
            };
            this.resetSeries = () => {
                this.eventBus.emit('resetHoveredSeries');
                this.eventBus.emit('resetSelectedSeries');
            };
            this.setResizeEventListeners = (eventName, options) => {
                var _a, _b, _c, _d;
                const { usingContainerSize } = this.store.state;
                const { width: usingContainerWidth, height: usingContainerHeight } = usingContainerSize;
                const width = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.chart) === null || _b === void 0 ? void 0 : _b.width;
                const height = (_d = (_c = options) === null || _c === void 0 ? void 0 : _c.chart) === null || _d === void 0 ? void 0 : _d.height;
                const isAutoWidth = isAutoValue(width);
                const isAutoHeight = isAutoValue(height);
                this.store.dispatch('setUsingContainerSize', getUsingContainerSize(eventName, usingContainerSize, width, height));
                if ((usingContainerWidth || usingContainerHeight) && isNumber(width) && isNumber(height)) {
                    this.clearResizeEvent();
                }
                else if (!(usingContainerWidth || usingContainerHeight) && (isAutoWidth || isAutoHeight)) {
                    this.setResizeEvent();
                }
            };
            const { el, options, series, categories, modules } = props;
            this.modules = (modules !== null && modules !== void 0 ? modules : []);
            if (isUndefined(options.usageStatistics) || options.usageStatistics) {
                sendHostname();
            }
            this.containerEl = el;
            this.el = this.createChartWrapper();
            this.containerEl.appendChild(this.el);
            this.animator = new Animator();
            this.store = new Store({
                series,
                categories,
                options,
            });
            this.componentManager = new ComponentManager({
                store: this.store,
                eventBus: this.eventBus,
            });
            this.eventBus.on('needLoop', debounce(() => {
                var _a, _b;
                let duration = this.getAnimationDuration((_a = options.chart) === null || _a === void 0 ? void 0 : _a.animation);
                if (this.animationControlFlag.resizing) {
                    duration = isUndefined(options.responsive)
                        ? this.getAnimationDuration()
                        : this.getAnimationDuration((_b = options.responsive) === null || _b === void 0 ? void 0 : _b.animation);
                    this.animationControlFlag.resizing = false;
                }
                this.eventBus.emit('loopStart');
                this.animator.add({
                    onCompleted: () => {
                        this.eventBus.emit('loopComplete');
                    },
                    chart: this,
                    duration,
                    requester: this,
                });
            }, 10));
            this.eventBus.on('needSubLoop', (opts) => {
                this.animator.add(Object.assign(Object.assign({}, opts), { chart: this }));
            });
            this.eventBus.on('needDraw', debounce(() => {
                this.draw();
            }, 10));
            this.initialize();
            this.store.observe(() => {
                this.painter.setup();
            });
            if (isAutoValue((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.chart) === null || _b === void 0 ? void 0 : _b.width) || isAutoValue((_d = (_c = options) === null || _c === void 0 ? void 0 : _c.chart) === null || _d === void 0 ? void 0 : _d.height)) {
                this.setResizeEvent();
            }
        }
        getAnimationDuration(animationOption) {
            const { firstRendering } = this.animator;
            const { resizing, updating } = this.animationControlFlag;
            let duration;
            if ((!firstRendering && !resizing) || isUndefined(animationOption)) {
                duration = DEFAULT_ANIM_DURATION;
            }
            else if (isBoolean(animationOption)) {
                duration = animationOption ? DEFAULT_ANIM_DURATION : 0;
            }
            else if (isNumber(animationOption.duration)) {
                duration = animationOption.duration;
            }
            if (updating) {
                duration = 0;
            }
            this.animationControlFlag.updating = false;
            return duration;
        }
        createChartWrapper() {
            const el = document.createElement('div');
            el.classList.add('toastui-chart-wrapper');
            return el;
        }
        resizeChartSize(containerWidth, containerHeight) {
            this.animationControlFlag.resizing = true;
            const { usingContainerSize: { width: usingContainerWidth, height: usingContainerHeight }, chart: { width, height }, } = this.store.state;
            if (!(usingContainerWidth || usingContainerHeight) ||
                !(containerWidth || containerHeight) ||
                (containerWidth === width && containerHeight === height)) {
                this.animationControlFlag.resizing = false;
                return;
            }
            // @TODO: For updates where the data doesn't change, it looks good to recalculate the selected series position.
            this.resetSeries();
            this.store.dispatch('setChartSize', {
                width: usingContainerWidth ? containerWidth : width,
                height: usingContainerHeight ? containerHeight : height,
            });
            this.draw();
        }
        setResizeEvent() {
            const { usingContainerSize } = this.store.state;
            if ((usingContainerSize.height && !this.containerEl.style.height.length) ||
                (usingContainerSize.width && !this.containerEl.style.width.length)) {
                throw new Error(message.AUTO_LAYOUT_CONTAINER_SIZE_ERROR);
            }
            const isResizeObserverAPIExist = typeof ResizeObserver === 'undefined';
            if (isResizeObserverAPIExist) {
                window.addEventListener('resize', this.debounceResizeEvent);
            }
            else {
                this.resizeObserver = new ResizeObserver((entries) => {
                    entries.forEach(() => {
                        this.debounceResizeEvent();
                    });
                });
                this.resizeObserver.observe(this.containerEl);
            }
        }
        clearResizeEvent() {
            if (this.resizeObserver) {
                this.resizeObserver.unobserve(this.containerEl);
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }
            else {
                window.removeEventListener('resize', this.debounceResizeEvent);
            }
        }
        handleCanvasMouseEvent(eventType, mousePosition) {
            const newEnteredComponents = [];
            this.componentManager.forEach((component) => {
                if (eventType === 'mousemove') {
                    const exist = this.enteredComponents.some((enteredComponent) => enteredComponent === component);
                    if (isMouseInRect(component.rect, mousePosition)) {
                        newEnteredComponents.push(component);
                        if (!exist && component.onMouseenterComponent) {
                            component.onMouseenterComponent();
                        }
                    }
                    else if (exist && component.onMouseoutComponent) {
                        component.onMouseoutComponent();
                    }
                }
                else if (eventType === 'mouseout' && component.onMouseoutComponent) {
                    component.onMouseoutComponent();
                }
            });
            this.enteredComponents = newEnteredComponents;
        }
        handleResponderEvent(event, mousePosition) {
            const eventType = event.type;
            const delegationMethod = `on${eventType[0].toUpperCase() + eventType.substring(1)}`;
            const allResponders = [];
            this.componentManager.forEach((component) => {
                if (!component[delegationMethod]) {
                    return;
                }
                if (!responderDetectors.rect(mousePosition, component.rect)) {
                    return;
                }
                const detected = (component.responders || []).filter((m) => {
                    return responderDetectors[m.type](mousePosition, m, component.rect);
                });
                if (detected.length) {
                    allResponders.push({ component, detected });
                }
                component[delegationMethod]({ mousePosition, responders: detected }, event);
            });
            if (this.handleEventForAllResponders) {
                this.handleEventForAllResponders(event, allResponders, delegationMethod, mousePosition);
            }
        }
        handleEvent(event) {
            const { clientX, clientY, type: eventType } = event;
            const canvas = this.painter.ctx.canvas;
            const { width, height, left, top } = canvas.getBoundingClientRect();
            // Calculate scale for chart affected by a CSS transform.
            const scaleX = width / canvas.offsetWidth;
            const scaleY = height / canvas.offsetHeight;
            const mousePosition = {
                x: (clientX - left) / scaleX,
                y: (clientY - top) / scaleY,
            };
            if (eventType === 'mousemove' || eventType === 'mouseout') {
                this.handleCanvasMouseEvent(eventType, mousePosition);
            }
            this.handleResponderEvent(event, mousePosition);
        }
        initStore() {
            [
                root$1,
                optionsStore,
                theme$1,
                seriesData$1,
                legend$1,
                layout$1,
                category$1,
                ...this.modules,
            ].forEach((module) => this.store.setModule(module));
        }
        initialize() {
            this.initStore();
            this.store.dispatch('initChartSize', this.containerEl);
        }
        draw() {
            this.painter.beforeFrame();
            this.componentManager.forEach((component) => {
                if (!component.isShow) {
                    return;
                }
                this.painter.beforeDraw(component.rect.x, component.rect.y);
                if (component.beforeDraw) {
                    component.beforeDraw(this.painter);
                }
                component.draw(this.painter);
                this.painter.afterDraw();
            });
        }
        update(delta) {
            this.componentManager.invoke('update', delta);
        }
        initUpdate(delta) {
            this.componentManager.invoke('initUpdate', delta);
        }
        isSelectableSeries() {
            var _a;
            return (_a = this.store.initStoreState.options.series) === null || _a === void 0 ? void 0 : _a.selectable;
        }
        /**
         * Set tooltip offset.
         * @param {Object} offset - Offset size
         *   @param {number} [offset.x] Offset value to move title horizontally
         *   @param {number} [offset.y] Offset value to move title vertically
         * @api
         * @example
         * chart.setTooltipOffset({x: 10, y: -20});
         */
        setTooltipOffset(offset) {
            const { x: offsetX, y: offsetY } = offset;
            this.store.dispatch('updateOptions', { options: { tooltip: { offsetX, offsetY } } });
        }
        dispatchOptionsEvent(eventName, options) {
            this.setResizeEventListeners(eventName, options);
            const { offsetWidth, offsetHeight } = this.containerEl;
            this.store.dispatch(eventName, {
                options,
                containerSize: { width: offsetWidth, height: offsetHeight },
            });
        }
    }

    function getLimitSafely(baseValues, isXAxis = false) {
        const limit = {
            min: Math.min(...baseValues),
            max: Math.max(...baseValues),
        };
        if (baseValues.length === 1) {
            const [firstValue] = baseValues;
            if (isXAxis) {
                limit.min = firstValue;
                limit.max = firstValue;
            }
            else if (firstValue > 0) {
                limit.min = 0;
            }
            else if (firstValue === 0) {
                limit.max = 10;
            }
            else {
                limit.max = 0;
            }
        }
        else if (limit.min === 0 && limit.max === 0) {
            limit.max = 10;
        }
        else if (limit.min === limit.max) {
            limit.min -= limit.min / 10;
            limit.max += limit.max / 10;
        }
        return limit;
    }
    function initDataRange(accDataRangeValue, curDataRangeValue, axisName) {
        var _a, _b, _c, _d;
        const defaultDataRange = {
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER,
        };
        return {
            min: Math.min(curDataRangeValue[axisName].min, (_b = (_a = accDataRangeValue[axisName]) === null || _a === void 0 ? void 0 : _a.min, (_b !== null && _b !== void 0 ? _b : defaultDataRange.min))),
            max: Math.max(curDataRangeValue[axisName].max, (_d = (_c = accDataRangeValue[axisName]) === null || _c === void 0 ? void 0 : _c.max, (_d !== null && _d !== void 0 ? _d : defaultDataRange.max))),
        };
    }
    function getTotalDataRange(seriesDataRange) {
        return Object.values(seriesDataRange).reduce((acc, cur) => {
            if (cur.xAxis) {
                acc.xAxis = initDataRange(acc, cur, 'xAxis');
            }
            if (cur.yAxis) {
                acc.yAxis = initDataRange(acc, cur, 'yAxis');
            }
            if (cur.secondaryYAxis) {
                acc.secondaryYAxis = initDataRange(acc, cur, 'secondaryYAxis');
            }
            if (cur.circularAxis) {
                acc.circularAxis = initDataRange(acc, cur, 'circularAxis');
            }
            if (cur.verticalAxis) {
                acc.verticalAxis = initDataRange(acc, cur, 'verticalAxis');
            }
            return acc;
        }, {});
    }
    function setSeriesDataRange({ options, seriesName, values, valueAxisName, seriesDataRange, }) {
        var _a;
        let axisNames;
        if (includes([AxisType.X, AxisType.CIRCULAR, AxisType.VERTICAL], valueAxisName)) {
            axisNames = [valueAxisName];
        }
        else {
            const optionsUsingYAxis = options;
            const { secondaryYAxis } = getYAxisOption(optionsUsingYAxis);
            axisNames =
                hasSecondaryYAxis(optionsUsingYAxis) && ((_a = secondaryYAxis) === null || _a === void 0 ? void 0 : _a.chartType)
                    ? [secondaryYAxis.chartType === seriesName ? 'secondaryYAxis' : 'yAxis']
                    : getValueAxisNames(optionsUsingYAxis, valueAxisName);
        }
        axisNames.forEach((axisName) => {
            seriesDataRange[seriesName][axisName] = getLimitSafely([...new Set(values)]);
        });
        return seriesDataRange;
    }
    function getBoxPlotValues(series, seriesName) {
        return series[seriesName].data.flatMap(({ data, outliers = [] }) => [
            ...((data !== null && data !== void 0 ? data : [])).flatMap((datum) => datum),
            ...((outliers !== null && outliers !== void 0 ? outliers : [])).flatMap((datum) => datum),
        ]);
    }
    function getBulletValues(series, seriesName) {
        return series[seriesName].data.flatMap(({ data, markers, ranges }) => [
            data,
            ...((markers !== null && markers !== void 0 ? markers : [])).flatMap((datum) => datum),
            ...((ranges !== null && ranges !== void 0 ? ranges : [])).flatMap((range) => range),
        ]);
    }
    function getCoordinateDataValues(values, categories, hasDateValue) {
        const yAxisValues = values
            .filter((value) => !isNull(value))
            .map((value) => getCoordinateYValue(value));
        const xAxisValues = categories.map((value) => hasDateValue ? Number(new Date(value)) : Number(value));
        return { xAxisValues, yAxisValues };
    }
    const dataRange = {
        name: 'dataRange',
        state: () => ({
            dataRange: {},
        }),
        action: {
            setDataRange({ state, initStoreState }) {
                const { series, disabledSeries, stackSeries, categories, options } = state;
                const seriesDataRange = {};
                const labelAxisOnYAxis = isLabelAxisOnYAxis({ series, options, categories });
                const { labelAxisName, valueAxisName } = getAxisName(labelAxisOnYAxis, series);
                Object.keys(series).forEach((seriesName) => {
                    var _a, _b;
                    seriesDataRange[seriesName] = {};
                    let values = series[seriesName].data.flatMap(({ data, name }) => disabledSeries.includes(name) ? [] : data);
                    const firstExistValue = getFirstValidValue(values);
                    if (isCoordinateSeries(initStoreState.series)) {
                        const hasDateValue = !!((_a = options.xAxis) === null || _a === void 0 ? void 0 : _a.date);
                        const { yAxisValues, xAxisValues } = getCoordinateDataValues(values, categories, hasDateValue);
                        values = yAxisValues;
                        seriesDataRange[seriesName][labelAxisName] = getLimitSafely([...xAxisValues], true);
                    }
                    else if (!series[seriesName].data.length) {
                        values = [];
                    }
                    else if (isRangeValue(firstExistValue)) {
                        values = values.reduce((arr, value) => {
                            if (isNull(value)) {
                                return arr;
                            }
                            return Array.isArray(value) ? [...arr, ...value] : [...value];
                        }, []);
                    }
                    else if (stackSeries && ((_b = stackSeries[seriesName]) === null || _b === void 0 ? void 0 : _b.stack)) {
                        values = stackSeries[seriesName].dataRangeValues;
                    }
                    else if (seriesName === 'boxPlot') {
                        values = getBoxPlotValues(series, seriesName);
                    }
                    else if (seriesName === 'bullet') {
                        values = getBulletValues(series, seriesName);
                    }
                    if (includes(['bar', 'column', 'radar', 'bullet'], seriesName)) {
                        values.push(0);
                    }
                    setSeriesDataRange({
                        options,
                        seriesName,
                        values,
                        valueAxisName,
                        seriesDataRange,
                    });
                });
                const newDataRange = getTotalDataRange(seriesDataRange);
                extend(state.dataRange, newDataRange);
            },
        },
        observe: {
            updateDataRange() {
                this.dispatch('setDataRange');
            },
        },
    };
    var dataRange$1 = dataRange;

    const SNAP_VALUES = [1, 2, 5, 10];
    const DEFAULT_PIXELS_PER_STEP = 88;
    function adjustLimitForOverflow({ min, max }, stepSize, overflowed) {
        return {
            min: overflowed.min ? min - stepSize : min,
            max: overflowed.max ? max + stepSize : max,
        };
    }
    function isSeriesOverflowed(scaleData, { min, max }, scaleOption) {
        var _a, _b;
        const scaleDataLimit = scaleData.limit;
        const hasMinOption = isNumber((_a = scaleOption) === null || _a === void 0 ? void 0 : _a.min);
        const hasMaxOption = isNumber((_b = scaleOption) === null || _b === void 0 ? void 0 : _b.max);
        const isOverflowedMin = !hasMinOption && scaleDataLimit.min === min && scaleDataLimit.min !== 0;
        const isOverflowedMax = !hasMaxOption && scaleDataLimit.max === max && scaleDataLimit.max !== 0;
        if (!isOverflowedMin && !isOverflowedMax) {
            return null;
        }
        return {
            min: isOverflowedMin,
            max: isOverflowedMax,
        };
    }
    function getDigits(num) {
        const logNumberDividedLN10 = num === 0 ? 1 : Math.log(Math.abs(num)) / Math.LN10;
        return Math.pow(10, Math.floor(logNumberDividedLN10));
    }
    function getSnappedNumber(num) {
        let snapNumber = 0;
        for (let i = 0, t = SNAP_VALUES.length; i < t; i += 1) {
            snapNumber = SNAP_VALUES[i];
            const guideValue = (snapNumber + (SNAP_VALUES[i + 1] || snapNumber)) / 2;
            if (num <= guideValue) {
                break;
            }
        }
        return snapNumber;
    }
    function getNormalizedStep(stepSize) {
        const placeNumber = getDigits(stepSize);
        const simplifiedStepValue = stepSize / placeNumber;
        return getSnappedNumber(simplifiedStepValue) * placeNumber;
    }
    /**
     * Get normalized limit values
     * max = 155 and step = 10 ---> max = 160
     */
    function getNormalizedLimit(limit, stepSize) {
        let { min, max } = limit;
        const minNumber = Math.min(getDigits(max), getDigits(stepSize));
        const placeNumber = minNumber > 1 ? 1 : 1 / minNumber;
        const fixedStep = stepSize * placeNumber;
        // ceil max value step digits
        max = (Math.ceil((max * placeNumber) / fixedStep) * fixedStep) / placeNumber;
        if (min > stepSize) {
            // floor min value to multiples of step
            min = (Math.floor((min * placeNumber) / fixedStep) * fixedStep) / placeNumber;
        }
        else if (min < 0) {
            min = -(Math.ceil((Math.abs(min) * placeNumber) / fixedStep) * fixedStep) / placeNumber;
        }
        else {
            min = 0;
        }
        return { min, max };
    }
    function getNormalizedStepCount(limitSize, stepSize) {
        const multiplier = 1 / Math.min(getDigits(limitSize), getDigits(stepSize));
        return Math.ceil((limitSize * multiplier) / (stepSize * multiplier));
    }
    function hasStepSize(stepSize) {
        return isNumber(stepSize);
    }
    function getNormalizedScale(scaleData, scale) {
        const stepSize = hasStepSize(scale.stepSize)
            ? scaleData.stepSize
            : getNormalizedStep(scaleData.stepSize);
        const edge = getNormalizedLimit(scaleData.limit, stepSize);
        const limitSize = Math.abs(edge.max - edge.min);
        const stepCount = getNormalizedStepCount(limitSize, stepSize);
        return {
            limit: {
                min: edge.min,
                max: edge.max,
            },
            stepSize,
            stepCount,
        };
    }
    function getRoughScale(scale, offsetSize, minStepSize = 1) {
        const { min, max } = scale;
        const limitSize = Math.abs(max - min);
        const valuePerPixel = limitSize / offsetSize;
        let stepCount = Math.ceil(offsetSize / DEFAULT_PIXELS_PER_STEP);
        const pixelsPerStep = offsetSize / stepCount;
        let stepSize = valuePerPixel * pixelsPerStep;
        if (hasStepSize(scale.stepSize)) {
            stepSize = scale.stepSize;
            stepCount = limitSize / stepSize;
        }
        else if (isNumber(minStepSize) && stepSize < minStepSize) {
            stepSize = minStepSize;
            stepCount = limitSize / stepSize;
        }
        return { limit: { min, max }, stepSize, stepCount };
    }
    function makeScaleOption(dataRange, scaleOptions) {
        var _a, _b, _c, _d, _e, _f;
        return {
            max: (_b = (_a = scaleOptions) === null || _a === void 0 ? void 0 : _a.max, (_b !== null && _b !== void 0 ? _b : dataRange.max)),
            min: (_d = (_c = scaleOptions) === null || _c === void 0 ? void 0 : _c.min, (_d !== null && _d !== void 0 ? _d : dataRange.min)),
            stepSize: (_f = (_e = scaleOptions) === null || _e === void 0 ? void 0 : _e.stepSize, (_f !== null && _f !== void 0 ? _f : 'auto')),
        };
    }
    function calculateCoordinateScale(options) {
        const { dataRange, scaleOption, offsetSize, minStepSize, useSpectrumLegend } = options;
        const scale = makeScaleOption(dataRange, scaleOption);
        const roughScale = getRoughScale(scale, offsetSize, minStepSize);
        const normalizedScale = getNormalizedScale(roughScale, scale);
        const overflowed = useSpectrumLegend
            ? null
            : isSeriesOverflowed(normalizedScale, scale, scaleOption);
        if (overflowed) {
            const { stepSize, limit } = normalizedScale;
            normalizedScale.limit = adjustLimitForOverflow(limit, stepSize, overflowed);
        }
        return normalizedScale;
    }
    function getStackScaleData(type) {
        if (type === 'minusPercentStack') {
            return { limit: { min: -100, max: 0 }, stepSize: 25, stepCount: 5 };
        }
        if (type === 'dualPercentStack') {
            return { limit: { min: -100, max: 100 }, stepSize: 25, stepCount: 9 };
        }
        if (type === 'divergingPercentStack') {
            return { limit: { min: -100, max: 100 }, stepSize: 25, stepCount: 9 };
        }
        return { limit: { min: 0, max: 100 }, stepSize: 25, stepCount: 5 };
    }
    function calculateXAxisScaleForCoordinateLineType(scale, options, categories) {
        const dateType = isDateType(options, AxisType.X);
        const values = categories.map((value) => (dateType ? Number(new Date(value)) : Number(value)));
        const { limit, stepSize } = scale;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const newLimit = Object.assign({}, limit);
        const distance = max - min;
        let positionRatio = 0;
        let sizeRatio = 1;
        if (distance) {
            if (limit.min < min) {
                newLimit.min += stepSize;
                positionRatio = (newLimit.min - min) / distance;
                sizeRatio -= positionRatio;
            }
            if (limit.max > max) {
                newLimit.max -= stepSize;
                sizeRatio -= (max - newLimit.max) / distance;
            }
        }
        const limitSize = Math.abs(newLimit.max - newLimit.min);
        const newStepCount = getNormalizedStepCount(limitSize, stepSize);
        return {
            limit: newLimit,
            stepCount: newStepCount,
            stepSize,
            positionRatio,
            sizeRatio,
        };
    }

    const msMap = {
        year: 31536000000,
        month: 2678400000,
        week: 604800000,
        date: 86400000,
        hour: 3600000,
        minute: 60000,
        second: 1000,
    };
    function calculateDatetimeScale(options) {
        const { dataRange, rawCategoriesSize, scaleOption } = options;
        const datetimeInfo = makeDatetimeInfo(dataRange, rawCategoriesSize, scaleOption);
        const { minDate, divisionNumber, limit } = datetimeInfo;
        const scale = calculateCoordinateScale(Object.assign(Object.assign({}, omit(options, 'scaleOption')), { dataRange: limit, minStepSize: 1 }));
        return restoreScaleToDatetimeType(scale, minDate, divisionNumber);
    }
    const msTypes = ['year', 'month', 'week', 'date', 'hour', 'minute', 'second'];
    function restoreScaleToDatetimeType(scale, minDate, divisionNumber) {
        const { limit, stepSize } = scale;
        const { min, max } = limit;
        return Object.assign(Object.assign({}, scale), { stepSize: multiply(stepSize, divisionNumber), limit: {
                min: multiply(add(min, minDate), divisionNumber),
                max: multiply(add(max, minDate), divisionNumber),
            } });
    }
    function makeDatetimeInfo(limit, count, scaleOption) {
        var _a, _b;
        const dateType = findDateType(limit, count);
        const divisionNumber = (_b = (_a = scaleOption) === null || _a === void 0 ? void 0 : _a.stepSize, (_b !== null && _b !== void 0 ? _b : msMap[dateType]));
        const scale = makeScaleOption(limit, scaleOption);
        const minDate = divide(Number(new Date(scale.min)), divisionNumber);
        const maxDate = divide(Number(new Date(scale.max)), divisionNumber);
        return { divisionNumber, minDate, limit: { min: 0, max: maxDate - minDate } };
    }
    function findDateType({ max, min }, count) {
        const diff = max - min;
        const lastTypeIndex = msTypes.length - 1;
        let foundType;
        if (diff) {
            msTypes.every((type, index) => {
                const millisecond = msMap[type];
                const dividedCount = Math.floor(diff / millisecond);
                let foundIndex;
                if (dividedCount) {
                    foundIndex =
                        index < lastTypeIndex && dividedCount < 2 && dividedCount < count ? index + 1 : index;
                    foundType = msTypes[foundIndex];
                }
                return !isExist(foundIndex);
            });
        }
        else {
            foundType = 'second';
        }
        return foundType;
    }

    function isPercentStack(stack) {
        var _a;
        return !!(((_a = stack) === null || _a === void 0 ? void 0 : _a.type) === 'percent');
    }
    function hasPercentStackSeries(stackSeries) {
        if (!stackSeries) {
            return false;
        }
        return Object.keys(stackSeries).some((seriesName) => isPercentStack(stackSeries[seriesName].stack));
    }
    function pickStackOption(options) {
        return (pickProperty(options, ['series', 'stack']) ||
            pickProperty(options, ['series', 'column', 'stack']) ||
            pickProperty(options, ['series', 'area', 'stack']));
    }

    const MIN_OFFSET_SIZE = 1;
    function getLabelScaleData(state, labelAxisOnYAxis, scaleOptions, labelAxisName) {
        var _a, _b;
        const { dataRange, layout, series, options } = state;
        const categories = state.categories;
        const rawCategories = state.rawCategories;
        const { labelSizeKey } = getSizeKey(labelAxisOnYAxis);
        const dateTypeLabel = isExist((_a = options.xAxis) === null || _a === void 0 ? void 0 : _a.date);
        const labelOptions = {
            dataRange: dataRange[labelAxisName],
            offsetSize: Math.max(layout.plot[labelSizeKey], MIN_OFFSET_SIZE),
            scaleOption: scaleOptions[labelAxisName],
            rawCategoriesSize: rawCategories.length,
        };
        let result;
        if (dataRange[labelAxisName]) {
            result = dateTypeLabel
                ? calculateDatetimeScale(labelOptions)
                : calculateCoordinateScale(labelOptions);
        }
        if (series.line && categories && !((_b = options.xAxis) === null || _b === void 0 ? void 0 : _b.pointOnColumn)) {
            result = calculateXAxisScaleForCoordinateLineType(result, options, categories);
        }
        return result;
    }
    function getValueScaleData(state, labelAxisOnYAxis, scaleOptions, valueAxisName, isCoordinateTypeChart) {
        const { dataRange, layout, series, stackSeries } = state;
        const { valueSizeKey } = getSizeKey(labelAxisOnYAxis);
        let result;
        if (hasPercentStackSeries(stackSeries)) {
            Object.keys(series).forEach((seriesName) => {
                result = getStackScaleData(stackSeries[seriesName].scaleType);
            });
        }
        else if (isCoordinateTypeChart) {
            const valueOptions = {
                dataRange: dataRange[valueAxisName],
                offsetSize: Math.max(layout.plot[valueSizeKey], MIN_OFFSET_SIZE),
                scaleOption: scaleOptions[valueAxisName],
            };
            result = calculateCoordinateScale(valueOptions);
        }
        else {
            result = calculateCoordinateScale({
                dataRange: dataRange[valueAxisName],
                offsetSize: Math.max(layout.plot[valueSizeKey], MIN_OFFSET_SIZE),
                scaleOption: scaleOptions[valueAxisName],
            });
        }
        return result;
    }
    function getScaleOptions(options, series, valueAxisName) {
        var _a, _b, _c, _d, _e, _f;
        const scaleOptions = {};
        if (isSeriesUsingRadialAxes(series)) {
            scaleOptions[valueAxisName] = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a[valueAxisName]) === null || _b === void 0 ? void 0 : _b.scale;
        }
        else {
            const { yAxis, secondaryYAxis } = getYAxisOption(options);
            scaleOptions.xAxis = (_d = (_c = options) === null || _c === void 0 ? void 0 : _c.xAxis) === null || _d === void 0 ? void 0 : _d.scale;
            scaleOptions.yAxis = (_e = yAxis) === null || _e === void 0 ? void 0 : _e.scale;
            if (secondaryYAxis) {
                scaleOptions.secondaryYAxis = (_f = secondaryYAxis) === null || _f === void 0 ? void 0 : _f.scale;
            }
        }
        return scaleOptions;
    }
    const scale = {
        name: 'scale',
        state: () => ({
            scale: {},
        }),
        action: {
            setScale({ state, initStoreState }) {
                const { series, options, categories } = state;
                const labelAxisOnYAxis = isLabelAxisOnYAxis({ series, options, categories });
                const { labelAxisName, valueAxisName } = getAxisName(labelAxisOnYAxis, series);
                const scaleOptions = getScaleOptions(options, series, valueAxisName);
                const isCoordinateTypeChart = isCoordinateSeries(initStoreState.series);
                const scaleData = {};
                getValueAxisNames(options, valueAxisName).forEach((axisName) => {
                    scaleData[axisName] = getValueScaleData(state, labelAxisOnYAxis, scaleOptions, axisName, isCoordinateTypeChart);
                });
                if (isCoordinateTypeChart) {
                    scaleData[labelAxisName] = getLabelScaleData(state, labelAxisOnYAxis, scaleOptions, labelAxisName);
                }
                state.scale = scaleData;
            },
        },
        observe: {
            updateScale() {
                this.dispatch('setScale');
            },
        },
    };
    var scale$1 = scale;

    function isExistPlotId(plots, data) {
        return plots.some(({ id: bandId }) => !isUndefined(bandId) && !isUndefined(data.id) && bandId === data.id);
    }

    function getOverlappingRange(ranges) {
        const overlappingRanges = ranges.reduce((acc, { range }) => {
            const [accStart, accEnd] = acc;
            const [start, end] = range;
            return [Math.min(accStart, start), Math.max(accEnd, end)];
        }, [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
        return {
            range: overlappingRanges,
            color: ranges[0].color,
        };
    }
    function getCategoryIndex(value, categories) {
        return categories.findIndex((category) => category === String(value));
    }
    function getValidValue(value, categories, isDateType = false) {
        if (isDateType) {
            return Number(new Date(value));
        }
        if (isString(value)) {
            return getCategoryIndex(value, categories);
        }
        return value;
    }
    function makePlotLines(categories, isDateType, plotLines = []) {
        return plotLines.map(({ value, color, opacity }) => ({
            value: getValidValue(value, categories, isDateType),
            color: rgba(color, opacity),
        }));
    }
    function makePlotBands(categories, isDateType, plotBands = []) {
        return plotBands.flatMap(({ range, mergeOverlappingRanges = false, color: bgColor, opacity }) => {
            const color = rgba(bgColor, opacity);
            const rangeArray = (isRangeValue(range[0]) ? range : [range]);
            const ranges = rangeArray.map((rangeData) => ({
                range: rangeData.map((value) => getValidValue(value, categories, isDateType)),
                color,
            }));
            return mergeOverlappingRanges ? getOverlappingRange(ranges) : ranges;
        });
    }
    const plot = {
        name: 'plot',
        state: ({ options }) => {
            var _a, _b, _c;
            return ({
                plot: {
                    visible: (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.plot) === null || _b === void 0 ? void 0 : _b.visible, (_c !== null && _c !== void 0 ? _c : true)),
                    lines: [],
                    bands: [],
                },
            });
        },
        action: {
            setPlot({ state }) {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const { series, options } = state;
                if (!(series.area || series.line)) {
                    return;
                }
                const rawCategories = state.rawCategories;
                const lineAreaOptions = options;
                const lines = makePlotLines(rawCategories, !!((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.xAxis) === null || _b === void 0 ? void 0 : _b.date), (_d = (_c = lineAreaOptions) === null || _c === void 0 ? void 0 : _c.plot) === null || _d === void 0 ? void 0 : _d.lines);
                const bands = makePlotBands(rawCategories, !!((_f = (_e = options) === null || _e === void 0 ? void 0 : _e.xAxis) === null || _f === void 0 ? void 0 : _f.date), (_h = (_g = lineAreaOptions) === null || _g === void 0 ? void 0 : _g.plot) === null || _h === void 0 ? void 0 : _h.bands);
                extend(state.plot, { lines, bands });
            },
            addPlotLine({ state }, { data }) {
                var _a, _b, _c;
                const lines = (_c = (_b = (_a = state.options) === null || _a === void 0 ? void 0 : _a.plot) === null || _b === void 0 ? void 0 : _b.lines, (_c !== null && _c !== void 0 ? _c : []));
                if (!isExistPlotId(lines, data)) {
                    this.dispatch('updateOptions', { options: { plot: { lines: [...lines, data] } } });
                }
            },
            addPlotBand({ state }, { data }) {
                var _a, _b, _c;
                const bands = (_c = (_b = (_a = state.options) === null || _a === void 0 ? void 0 : _a.plot) === null || _b === void 0 ? void 0 : _b.bands, (_c !== null && _c !== void 0 ? _c : []));
                if (!isExistPlotId(bands, data)) {
                    this.dispatch('updateOptions', { options: { plot: { bands: [...bands, data] } } });
                }
            },
            removePlotLine({ state }, { id }) {
                var _a, _b, _c;
                const lines = (_c = (_b = (_a = state.options) === null || _a === void 0 ? void 0 : _a.plot) === null || _b === void 0 ? void 0 : _b.lines, (_c !== null && _c !== void 0 ? _c : [])).filter(({ id: lineId }) => lineId !== id);
                this.dispatch('updateOptions', { options: { plot: { lines } } });
            },
            removePlotBand({ state }, { id }) {
                var _a, _b, _c;
                const bands = (_c = (_b = (_a = state.options) === null || _a === void 0 ? void 0 : _a.plot) === null || _b === void 0 ? void 0 : _b.bands, (_c !== null && _c !== void 0 ? _c : [])).filter(({ id: bandId }) => bandId !== id);
                this.dispatch('updateOptions', { options: { plot: { bands } } });
            },
        },
        observe: {
            updatePlot() {
                this.dispatch('setPlot');
            },
        },
    };
    var plot$1 = plot;

    function isBubblePointType(value) {
        return value.hasOwnProperty('r');
    }
    function getValueString(value) {
        let result = '';
        if (isRangeValue(value)) {
            result = `${value[0]} ~ ${value[1]}`;
        }
        else if (isObject(value) && !Array.isArray(value)) {
            result = `(${value.x}, ${value.y})` + (isBubblePointType(value) ? `, r: ${value.r}` : '');
        }
        else {
            result = String(value);
        }
        return result;
    }

    function getSeriesNameTemplate(label, color) {
        return `<span class="toastui-chart-series-name">
    <i class="toastui-chart-icon" style="background: ${color}"></i>
    <span class="toastui-chart-name">${label}</span>
  </span>`;
    }
    function getTitleValueTemplate(title, value) {
        return `<div class="toastui-chart-tooltip-series">
    <span class="toastui-chart-series-name">${title}</span>
    <span class="toastui-chart-series-value">${value}</span>
  </div>`;
    }
    function getColorValueTemplate(color, value) {
        return `<div class="toastui-chart-tooltip-series">
    <i class="toastui-chart-icon" style="background: ${color}"></i>
    <span class="toastui-chart-series-value">${value}</span>
  </div>`;
    }
    function makeBulletDataTemplate(data, titleType) {
        return data
            .filter(({ title }) => title === titleType)
            .sort((a, b) => {
            if (isRangeValue(a.value) && isRangeValue(b.value)) {
                return a.value[0] - b.value[0];
            }
            if (isNumber(a.value) && isNumber(b.value)) {
                return a.value - b.value;
            }
            return 0;
        })
            .map(({ formattedValue, color }) => getColorValueTemplate(color, formattedValue))
            .join('');
    }
    function getDefaultTemplate(model, { header, body }, theme) {
        const { borderColor, borderWidth, background, borderRadius, borderStyle } = theme;
        const style = `border: ${borderWidth}px ${borderStyle} ${borderColor};border-radius: ${borderRadius}px;background: ${background};`;
        return `<div class="toastui-chart-tooltip" style="${style}">${header}${body}</div>`;
    }
    function getHeaderTemplate({ category }, theme) {
        return category
            ? `<div class="toastui-chart-tooltip-category" style="${getFontStyleString(theme.header)}">
        ${category}
      </div>`
            : '';
    }
    function getDefaultBodyTemplate({ data }, theme) {
        return `
    <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
      ${data
        .map(({ label, color, formattedValue }) => `<div class="toastui-chart-tooltip-series">
                ${getSeriesNameTemplate(label, color)}
                <span class="toastui-chart-series-value">${formattedValue}</span>
              </div>`)
        .join('')}
    </div>`;
    }
    function getBoxPlotTemplate({ data }, theme) {
        const groupedData = data.reduce((acc, item, index) => {
            if (!index) {
                return item;
            }
            if (acc.category === item.category && acc.label === item.label) {
                acc.value = [...acc.value, ...item.value];
            }
            return acc;
        }, {});
        return `
    <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
      ${[groupedData]
        .map(({ label, color, value: values }) => `<div class="toastui-chart-tooltip-series">
              ${getSeriesNameTemplate(label, color)}
            </div>
            <div>
          ${values
        .map(({ title, formattedValue }) => getTitleValueTemplate(title, formattedValue))
        .join('')}
            </div>`)
        .join('')}
    </div>`;
    }
    function getBulletTemplate({ data }, theme) {
        return data.length > 1
            ? getBulletGroupedTemplate(data, theme)
            : getBulletBasicTemplate(data, theme);
    }
    function getBulletBasicTemplate(data, theme) {
        return `
    <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
      ${data
        .map(({ label, color, value: values }) => `<div class="toastui-chart-tooltip-series">${getSeriesNameTemplate(label, color)}</div>
            ${values
        .map(({ title, formattedValue }) => getTitleValueTemplate(title, formattedValue))
        .join('')}`)
        .join('')}
    </div>`;
    }
    function getBulletGroupedTemplate(data, theme) {
        const bulletData = data.map(({ value }) => value[0]);
        const [actual, ranges, markers] = ['Actual', 'Range', 'Marker'].map((titleType) => makeBulletDataTemplate(bulletData, titleType));
        return `<div class="toastui-chart-tooltip-category" style="${getFontStyleString(theme.header)}">
      ${data[0].label}
    </div>
    <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
      ${actual ? '<div class="toastui-chart-tooltip-title">Actual</div>' : ''} ${actual}
      ${ranges ? '<div class="toastui-chart-tooltip-title">Ranges</div>' : ''} ${ranges}
      ${markers ? '<div class="toastui-chart-tooltip-title">Markers</div>' : ''} ${markers}
    </div>`;
    }
    function getPieTemplate({ data }, theme) {
        return `
    <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
      ${data
        .map(({ label, color, formattedValue, percentValue }) => `<div class="toastui-chart-tooltip-series">
          ${getSeriesNameTemplate(label, color)}
          <span class="toastui-chart-series-value">${pieTooltipLabelFormatter(percentValue)}&nbsp;&nbsp;(${formattedValue})</span>
        </div>`)
        .join('')}
    </div>`;
    }
    function getHeatmapTemplate({ data }, theme) {
        return `${data
        .map(({ label, color, formattedValue }) => `<div class="toastui-chart-tooltip-category" style="${getFontStyleString(theme.header)}">
          ${label}
        </div>
        <div class="toastui-chart-tooltip-series-wrapper" style="${getFontStyleString(theme.body)}">
          <div class="toastui-chart-tooltip-series">
            ${getSeriesNameTemplate(formattedValue, color)}
          </div>
        </div>`)
        .join('')}`;
    }
    const tooltipTemplates = {
        default: getDefaultTemplate,
        defaultHeader: getHeaderTemplate,
        defaultBody: getDefaultBodyTemplate,
        boxPlot: getBoxPlotTemplate,
        bullet: getBulletTemplate,
        pie: getPieTemplate,
        heatmap: getHeatmapTemplate,
    };
    function getBodyTemplate(type) {
        return tooltipTemplates[type || 'defaultBody'];
    }

    function findNodes(element, selector) {
        return element.querySelectorAll(selector);
    }
    function removeNode(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    const HTML_ATTR_LIST_RX = new RegExp('^(abbr|align|alt|axis|bgcolor|border|cellpadding|cellspacing|class|clear|' +
        'color|cols|compact|coords|dir|face|headers|height|hreflang|hspace|' +
        'ismap|lang|language|nohref|nowrap|rel|rev|rows|rules|' +
        'scope|scrolling|shape|size|span|start|summary|tabindex|target|title|type|' +
        'valign|value|vspace|width|checked|mathvariant|encoding|id|name|' +
        'background|cite|href|longdesc|src|usemap|xlink:href|data-+|checked|style)', 'g');
    const SVG_ATTR_LIST_RX = new RegExp('^(accent-height|accumulate|additive|alphabetic|arabic-form|ascent|' +
        'baseProfile|bbox|begin|by|calcMode|cap-height|class|color|color-rendering|content|' +
        'cx|cy|d|dx|dy|descent|display|dur|end|fill|fill-rule|font-family|font-size|font-stretch|' +
        'font-style|font-variant|font-weight|from|fx|fy|g1|g2|glyph-name|gradientUnits|hanging|' +
        'height|horiz-adv-x|horiz-origin-x|ideographic|k|keyPoints|keySplines|keyTimes|lang|' +
        'marker-end|marker-mid|marker-start|markerHeight|markerUnits|markerWidth|mathematical|' +
        'max|min|offset|opacity|orient|origin|overline-position|overline-thickness|panose-1|' +
        'path|pathLength|points|preserveAspectRatio|r|refX|refY|repeatCount|repeatDur|' +
        'requiredExtensions|requiredFeatures|restart|rotate|rx|ry|slope|stemh|stemv|stop-color|' +
        'stop-opacity|strikethrough-position|strikethrough-thickness|stroke|stroke-dasharray|' +
        'stroke-dashoffset|stroke-linecap|stroke-linejoin|stroke-miterlimit|stroke-opacity|' +
        'stroke-width|systemLanguage|target|text-anchor|to|transform|type|u1|u2|underline-position|' +
        'underline-thickness|unicode|unicode-range|units-per-em|values|version|viewBox|visibility|' +
        'width|widths|x|x-height|x1|x2|xlink:actuate|xlink:arcrole|xlink:role|xlink:show|xlink:title|' +
        'xlink:type|xml:base|xml:lang|xml:space|xmlns|xmlns:xlink|y|y1|y2|zoomAndPan)', 'g');
    const DEFAULT_TAG_DENY_LIST = [
        'script',
        'iframe',
        'textarea',
        'form',
        'button',
        'select',
        'input',
        'meta',
        'style',
        'link',
        'title',
        'embed',
        'object',
    ];
    const XSS_ATTR_RX = /href|src|background/gi;
    const XSS_VALUE_RX = /((java|vb|live)script|x):/gi;
    const ON_EVENT_RX = /^on\S+/;
    function sanitizeHTML(html) {
        const root = document.createElement('div');
        if (isString(html)) {
            html = html.replace(/<!--[\s\S]*?-->/g, '');
            root.innerHTML = html;
        }
        else {
            root.appendChild(html);
        }
        removeUnnecessaryTags(root);
        leaveOnlyWhitelistAttribute(root);
        return root.innerHTML;
    }
    function removeUnnecessaryTags(html) {
        const removedTags = findNodes(html, DEFAULT_TAG_DENY_LIST.join(','));
        removedTags.forEach((node) => {
            removeNode(node);
        });
    }
    function isXSSAttribute(attrName, attrValue) {
        return attrName.match(XSS_ATTR_RX) && attrValue.match(XSS_VALUE_RX);
    }
    function removeBlacklistAttributes(node, blacklistAttrs) {
        blacklistAttrs.forEach(({ name }) => {
            if (ON_EVENT_RX.test(name)) {
                node[name] = null;
            }
            if (node.getAttribute(name)) {
                node.removeAttribute(name);
            }
        });
    }
    function leaveOnlyWhitelistAttribute(html) {
        findNodes(html, '*').forEach((node) => {
            const { attributes } = node;
            const blacklist = toArray(attributes).filter((attr) => {
                const { name, value } = attr;
                const htmlAttr = name.match(HTML_ATTR_LIST_RX);
                const svgAttr = name.match(SVG_ATTR_LIST_RX);
                const xssAttr = htmlAttr && isXSSAttribute(name, value);
                return (!htmlAttr && !svgAttr) || xssAttr;
            });
            removeBlacklistAttributes(node, blacklist);
        });
    }

    const DEFAULT_TOOLTIP_TRANSITION = 'transform 0.2s ease';
    class Tooltip extends Component {
        constructor() {
            super(...arguments);
            this.tooltipInfoModels = {};
            this.onSeriesPointHovered = ({ models, name }) => {
                var _a;
                this.tooltipInfoModels[name] = ((_a = models) === null || _a === void 0 ? void 0 : _a.length) ? [...models] : [];
                const isShow = !!this.getTooltipInfoModels().length;
                if (isShow) {
                    this.renderTooltip();
                }
                else {
                    this.removeTooltip();
                }
            };
        }
        isTooltipContainerOverflow(x, y) {
            const { width, height } = this.tooltipContainerEl.getBoundingClientRect();
            const { x: rectX, y: rectY, width: rectWidth, height: rectHeight } = this.rect;
            return {
                overflowX: x > rectX + rectWidth || x + width > rectX + rectWidth,
                overflowY: y > rectY + rectHeight || y + height > rectY + rectHeight,
            };
        }
        getPositionInRect(model) {
            const { target } = model;
            const startX = this.rect.x + model.x;
            const startY = this.rect.y + model.y;
            let x = startX + target.radius + target.width + this.offsetX;
            let y = startY + this.offsetY;
            const { overflowX, overflowY } = this.isTooltipContainerOverflow(x, y);
            const { width, height } = this.tooltipContainerEl.getBoundingClientRect();
            if (overflowX) {
                x =
                    startX - (width + target.radius + this.offsetX) > 0
                        ? startX - (width + target.radius + this.offsetX)
                        : startX + this.offsetX;
            }
            if (overflowY) {
                y =
                    startY + target.height - (height + this.offsetY) > 0
                        ? startY + target.height - (height + this.offsetY)
                        : y;
            }
            return { x, y };
        }
        setTooltipPosition(model) {
            const { x, y } = this.getPositionInRect(model);
            this.tooltipContainerEl.style.transform = getTranslateString(x, y);
        }
        getTooltipInfoModels() {
            return Object.values(this.tooltipInfoModels).flatMap((item) => item);
        }
        renderTooltip() {
            const model = this.getTooltipInfoModels().reduce((acc, item) => {
                const { data, x, y, radius, width, height } = item;
                acc.x = acc.x ? (acc.x + x) / 2 : x;
                acc.y = acc.y ? (acc.y + y) / 2 : y;
                if (isNumber(radius)) {
                    acc.target.radius = radius;
                }
                if (width) {
                    acc.target.width = width;
                }
                if (height) {
                    acc.target.height = height;
                }
                acc.data.push(Object.assign(Object.assign({}, data), { value: Array.isArray(data.value)
                        ? data.value.map((titleValue) => (Object.assign(Object.assign({}, titleValue), { formattedValue: this.getFormattedValue(titleValue.value, data) })))
                        : data.value, formattedValue: this.getFormattedValue(data.value, data) }));
                if (!acc.category && data.category) {
                    acc.category = data.category;
                }
                if (data.templateType) {
                    acc.templateType = data.templateType;
                }
                return acc;
            }, { type: 'tooltip', x: 0, y: 0, data: [], target: { radius: 0, width: 0, height: 0 } });
            this.tooltipContainerEl.innerHTML = sanitizeHTML(this.templateFunc(model, {
                header: tooltipTemplates.defaultHeader(model, this.theme),
                body: getBodyTemplate(model.templateType)(model, this.theme),
            }, this.theme));
            this.setTooltipPosition(model);
        }
        initialize({ chartEl }) {
            this.type = 'tooltip';
            this.name = 'tooltip';
            this.chartEl = chartEl;
            this.tooltipContainerEl = document.createElement('div');
            this.tooltipContainerEl.classList.add('toastui-chart-tooltip-container');
            const { width, height, top, left } = this.chartEl.getBoundingClientRect();
            this.tooltipContainerEl.style.transform = getTranslateString(left + width / 2, top + height / 2);
            this.chartEl.appendChild(this.tooltipContainerEl);
            this.eventBus.on('seriesPointHovered', this.onSeriesPointHovered);
        }
        removeTooltip() {
            this.tooltipContainerEl.innerHTML = '';
        }
        setTooltipTransition(options) {
            var _a;
            const transition = (_a = options.tooltip) === null || _a === void 0 ? void 0 : _a.transition;
            if (isBoolean(transition) && transition) {
                this.tooltipContainerEl.style.transition = DEFAULT_TOOLTIP_TRANSITION;
            }
            else if (isString(transition)) {
                this.tooltipContainerEl.style.transition = transition;
            }
        }
        render({ layout, options, theme }) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            this.setTooltipTransition(options);
            this.rect = layout.plot;
            this.theme = theme.tooltip;
            this.templateFunc = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.tooltip) === null || _b === void 0 ? void 0 : _b.template, (_c !== null && _c !== void 0 ? _c : tooltipTemplates['default']));
            this.offsetX = (_f = (_e = (_d = options) === null || _d === void 0 ? void 0 : _d.tooltip) === null || _e === void 0 ? void 0 : _e.offsetX, (_f !== null && _f !== void 0 ? _f : 10));
            this.offsetY = (_j = (_h = (_g = options) === null || _g === void 0 ? void 0 : _g.tooltip) === null || _h === void 0 ? void 0 : _h.offsetY, (_j !== null && _j !== void 0 ? _j : 0));
            this.formatter = (_l = (_k = options) === null || _k === void 0 ? void 0 : _k.tooltip) === null || _l === void 0 ? void 0 : _l.formatter;
        }
        getFormattedValue(value, tooltipDataInfo) {
            return this.formatter
                ? this.formatter(value, tooltipDataInfo)
                : getValueString(value);
        }
    }

    function getValidIndex(index, startIndex = 0) {
        return ~~index ? index - startIndex : index;
    }
    function validXPosition({ axisData, offsetSize, value, startIndex = 0 }) {
        const dataIndex = getValidIndex(value, startIndex);
        const x = getXPosition(axisData, offsetSize, value, dataIndex);
        return x > 0 ? Math.min(offsetSize, x) : 0;
    }
    function getPlotAxisData(vertical, axes) {
        return vertical ? axes.xAxis : axes.yAxis;
    }
    class Plot extends Component {
        constructor() {
            super(...arguments);
            this.models = { plot: [], line: [], band: [] };
            this.startIndex = 0;
        }
        initialize() {
            this.type = 'plot';
        }
        getPlotAxisSize(vertical) {
            return {
                offsetSize: vertical ? this.rect.width : this.rect.height,
                anchorSize: vertical ? this.rect.height : this.rect.width,
            };
        }
        renderLines(axes, categories, lines = []) {
            return lines.map(({ value, color }) => {
                const { offsetSize } = this.getPlotAxisSize(true);
                const position = validXPosition({
                    axisData: getPlotAxisData(true, axes),
                    offsetSize,
                    value,
                    categories,
                    startIndex: this.startIndex,
                });
                return this.makeLineModel(true, position, { color });
            });
        }
        renderBands(axes, categories, bands = []) {
            const { offsetSize, anchorSize } = this.getPlotAxisSize(true);
            return bands.map(({ range, color }) => {
                const [start, end] = range.map((value) => validXPosition({
                    axisData: getPlotAxisData(true, axes),
                    offsetSize,
                    value,
                    categories,
                    startIndex: this.startIndex,
                }));
                return {
                    type: 'rect',
                    x: crispPixel(start),
                    y: crispPixel(0),
                    width: end - start,
                    height: anchorSize,
                    color,
                };
            });
        }
        renderPlotLineModels(relativePositions, vertical, options = {}) {
            var _a, _b, _c;
            const { size, startPosition, axes } = options;
            const { lineColor: color, lineWidth, dashSegments } = this.theme[vertical ? 'vertical' : 'horizontal'];
            const tickInterval = ((_c = (vertical ? (_a = axes) === null || _a === void 0 ? void 0 : _a.xAxis : (_b = axes) === null || _b === void 0 ? void 0 : _b.yAxis)) === null || _c === void 0 ? void 0 : _c.tickInterval) || 1;
            return relativePositions
                .filter((_, idx) => !(idx % tickInterval))
                .map((position) => this.makeLineModel(vertical, position, { color, lineWidth, dashSegments }, (size !== null && size !== void 0 ? size : this.rect.width), (startPosition !== null && startPosition !== void 0 ? startPosition : 0)));
        }
        renderPlotsForCenterYAxis(axes) {
            const { xAxisHalfSize, secondStartX, yAxisHeight } = axes.centerYAxis;
            // vertical
            const xAxisTickCount = axes.xAxis.tickCount;
            const verticalLines = [
                ...this.renderPlotLineModels(makeTickPixelPositions(xAxisHalfSize, xAxisTickCount), true),
                ...this.renderPlotLineModels(makeTickPixelPositions(xAxisHalfSize, xAxisTickCount, secondStartX), true),
            ];
            // horizontal
            const yAxisTickCount = axes.yAxis.tickCount;
            const yAxisTickPixelPositions = makeTickPixelPositions(yAxisHeight, yAxisTickCount);
            const horizontalLines = [
                ...this.renderPlotLineModels(yAxisTickPixelPositions, false, { size: xAxisHalfSize }),
                ...this.renderPlotLineModels(yAxisTickPixelPositions, false, {
                    size: xAxisHalfSize,
                    startPosition: secondStartX,
                }),
            ];
            return [...verticalLines, ...horizontalLines];
        }
        renderPlots(axes, scale) {
            const vertical = true;
            return axes.centerYAxis
                ? this.renderPlotsForCenterYAxis(axes)
                : [
                    ...this.renderPlotLineModels(this.getHorizontalTickPixelPositions(axes), !vertical, {
                        axes,
                    }),
                    ...this.renderPlotLineModels(this.getVerticalTickPixelPositions(axes, scale), vertical, {
                        axes,
                    }),
                ];
        }
        getVerticalTickPixelPositions(axes, scale) {
            var _a, _b, _c, _d, _e, _f, _g;
            const { offsetSize } = this.getPlotAxisSize(true);
            const axisData = getPlotAxisData(true, axes);
            if ((_a = axisData) === null || _a === void 0 ? void 0 : _a.labelRange) {
                const sizeRatio = (_d = (_c = (_b = scale) === null || _b === void 0 ? void 0 : _b.xAxis) === null || _c === void 0 ? void 0 : _c.sizeRatio, (_d !== null && _d !== void 0 ? _d : 1));
                const positionRatio = (_g = (_f = (_e = scale) === null || _e === void 0 ? void 0 : _e.xAxis) === null || _f === void 0 ? void 0 : _f.positionRatio, (_g !== null && _g !== void 0 ? _g : 0));
                const axisSizeAppliedRatio = offsetSize * sizeRatio;
                const additional = offsetSize * positionRatio;
                return makeTickPixelPositions(axisSizeAppliedRatio, axisData.tickCount, additional);
            }
            return makeTickPixelPositions(offsetSize, axisData.tickCount);
        }
        getHorizontalTickPixelPositions(axes) {
            const { offsetSize } = this.getPlotAxisSize(false);
            const axisData = getPlotAxisData(false, axes);
            return makeTickPixelPositions(offsetSize, axisData.tickCount);
        }
        renderPlotBackgroundRect() {
            return Object.assign(Object.assign({ type: 'rect', x: 0, y: 0 }, pick(this.rect, 'width', 'height')), { color: this.theme.backgroundColor });
        }
        render(state) {
            var _a, _b, _c;
            const { layout, axes, plot, zoomRange, theme, scale } = state;
            if (!plot) {
                return;
            }
            this.rect = layout.plot;
            this.startIndex = (_b = (_a = zoomRange) === null || _a === void 0 ? void 0 : _a[0], (_b !== null && _b !== void 0 ? _b : 0));
            this.theme = theme.plot;
            const categories = (_c = state.categories, (_c !== null && _c !== void 0 ? _c : []));
            const { lines, bands, visible } = plot;
            this.models.line = this.renderLines(axes, categories, lines);
            this.models.band = this.renderBands(axes, categories, bands);
            if (visible) {
                this.models.plot = [this.renderPlotBackgroundRect(), ...this.renderPlots(axes, scale)];
            }
        }
        makeLineModel(vertical, position, { color, dashSegments = [], lineWidth = 1, }, sizeWidth, xPos = 0) {
            const x = vertical ? crispPixel(position) : crispPixel(xPos);
            const y = vertical ? crispPixel(0) : crispPixel(position);
            const width = vertical ? 0 : (sizeWidth !== null && sizeWidth !== void 0 ? sizeWidth : this.rect.width);
            const height = vertical ? this.rect.height : 0;
            return {
                type: 'line',
                x,
                y,
                x2: x + width,
                y2: y + height,
                strokeStyle: color,
                lineWidth,
                dashSegments,
            };
        }
        beforeDraw(painter) {
            painter.ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            painter.ctx.lineWidth = 1;
        }
    }

    // eslint-disable-next-line complexity
    function isSameSeriesResponder({ models, comparisonModel, name, eventDetectType, }) {
        switch (name) {
            case 'heatmap':
                return isClickSameNameResponder(models, comparisonModel);
            case 'bullet':
                return eventDetectType === 'grouped'
                    ? isClickSameGroupedRectResponder(models, comparisonModel)
                    : isClickSameNameResponder(models, comparisonModel);
            case 'radar':
            case 'bubble':
            case 'scatter':
            case 'area':
            case 'line':
                return isClickSameCircleResponder(models, comparisonModel);
            case 'pie':
                return isClickSameDataResponder(models, comparisonModel);
            case 'column':
            case 'bar':
                return eventDetectType === 'grouped'
                    ? isClickSameGroupedRectResponder(models, comparisonModel)
                    : isClickSameDataResponder(models, comparisonModel);
            case 'boxPlot':
                return eventDetectType === 'grouped'
                    ? isClickSameDataResponder(models, comparisonModel)
                    : isClickSameBoxPlotDataResponder(models, comparisonModel);
            case 'treemap':
                return isClickSameLabelResponder(models, comparisonModel);
            case 'gauge':
                return isClickSameNameResponder(models, comparisonModel);
            default:
                return false;
        }
    }
    function getNearestResponder(responders, mousePosition, rect) {
        let minDistance = Infinity;
        let result = [];
        responders.forEach((responder) => {
            const { x, y, radius } = responder;
            const responderPoint = { x: x + rect.x, y: y + rect.y };
            const distance = getDistance(responderPoint, mousePosition);
            if (minDistance > distance) {
                minDistance = distance;
                result = [responder];
            }
            else if (minDistance === distance) {
                if (result.length && result[0].radius > radius) {
                    result = [responder];
                }
                else {
                    result.push(responder);
                }
            }
        });
        return result;
    }
    function makeRectResponderModel(rect, axis, categories, vertical = true) {
        const { pointOnColumn, tickDistance, rectResponderCount } = axis;
        const { width, height } = rect;
        const halfDetectAreaIndex = pointOnColumn ? [] : [0, rectResponderCount - 1];
        const halfSize = tickDistance / 2;
        return range(0, rectResponderCount).map((index) => {
            const half = halfDetectAreaIndex.includes(index);
            const size = half ? halfSize : tickDistance;
            let startPos = 0;
            if (index !== 0) {
                startPos += pointOnColumn ? tickDistance * index : halfSize + tickDistance * (index - 1);
            }
            return {
                type: 'rect',
                y: vertical ? 0 : startPos,
                height: vertical ? height : size,
                x: vertical ? startPos : 0,
                width: vertical ? size : width,
                index,
                label: categories[index],
            };
        });
    }
    function makeRectResponderModelForCoordinateType(responderInfo, rect) {
        const { width, height } = rect;
        let startPos = 0;
        return responderInfo
            .sort((a, b) => a.x - b.x)
            .reduce((acc, model, index) => {
            const { x, label } = model;
            const next = responderInfo[index + 1];
            const endPos = next ? (next.x + x) / 2 : width;
            const rectResponderModel = {
                type: 'rect',
                x: startPos,
                y: 0,
                width: endPos - startPos,
                height,
                label,
                index,
            };
            startPos = endPos;
            return [...acc, rectResponderModel];
        }, []);
    }
    function makeTooltipCircleMap(seriesCircleModel, tooltipDataArr) {
        const dataMap = tooltipDataArr.reduce((acc, cur) => {
            const { index, seriesIndex } = cur;
            if (!acc[seriesIndex]) {
                acc[seriesIndex] = [];
            }
            acc[seriesIndex][index] = cur;
            return acc;
        }, []);
        return seriesCircleModel.reduce((acc, model) => {
            const { seriesIndex, index } = model;
            const data = dataMap[seriesIndex][index];
            const { category } = data;
            if (!category) {
                return acc;
            }
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(Object.assign(Object.assign({}, model), { data }));
            return acc;
        }, {});
    }
    function isClickSameNameResponder(responders, selectedSeries) {
        var _a;
        return (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length) && responders[0].name === selectedSeries[0].name);
    }
    function isClickSameCircleResponder(responders, selectedSeries) {
        var _a;
        let same = false;
        if (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length) && responders.length === selectedSeries.length) {
            same = responders.reduce((acc, cur, idx) => {
                return (acc &&
                    cur.seriesIndex === selectedSeries[idx].seriesIndex &&
                    cur.index === selectedSeries[idx].index);
            }, true);
        }
        return same;
    }
    function isClickSameDataResponder(responders, selectedSeries) {
        var _a;
        let same = false;
        if (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length) && responders.length === selectedSeries.length) {
            same = responders.reduce((acc, cur, idx) => {
                var _a, _b, _c, _d;
                return (acc &&
                    ((_a = cur.data) === null || _a === void 0 ? void 0 : _a.label) === ((_b = selectedSeries[idx].data) === null || _b === void 0 ? void 0 : _b.label) &&
                    ((_c = cur.data) === null || _c === void 0 ? void 0 : _c.category) === ((_d = selectedSeries[idx].data) === null || _d === void 0 ? void 0 : _d.category));
            }, true);
        }
        return same;
    }
    function isClickSameLabelResponder(responders, selectedSeries) {
        var _a;
        return (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length) && responders[0].label === selectedSeries[0].label);
    }
    function isClickSameGroupedRectResponder(responders, selectedSeries) {
        var _a;
        return (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length) && responders[0].index === selectedSeries[0].index);
    }
    function isClickSameBoxPlotDataResponder(responders, selectedSeries) {
        var _a, _b, _c, _d, _e;
        let same = false;
        if (responders.length && ((_a = selectedSeries) === null || _a === void 0 ? void 0 : _a.length)) {
            const { type, data } = responders[0];
            same =
                type === selectedSeries[0].type &&
                    ((_b = data) === null || _b === void 0 ? void 0 : _b.label) === ((_c = selectedSeries[0].data) === null || _c === void 0 ? void 0 : _c.label) &&
                    ((_d = data) === null || _d === void 0 ? void 0 : _d.category) === ((_e = selectedSeries[0].data) === null || _e === void 0 ? void 0 : _e.category);
        }
        return same;
    }

    const RADIUS_PADDING = 30;
    const CALLOUT_LENGTH = 20;
    function getDefaultAnchor(type, withStack = false) {
        let anchor = 'auto';
        switch (type) {
            case 'point':
                anchor = 'center';
                break;
            case 'rect':
                anchor = !withStack ? 'auto' : 'center';
                break;
            case 'sector':
            case 'treemapSeriesName':
                anchor = 'center';
                break;
            case 'stackTotal':
                anchor = 'auto';
                break;
        }
        return anchor;
    }
    function getAnchor(dataLabelOptions, type, withStack = false) {
        return type !== 'stackTotal' &&
            includes(['center', 'start', 'end', 'auto', 'outer'], dataLabelOptions.anchor)
            ? dataLabelOptions.anchor
            : getDefaultAnchor(type, withStack);
    }
    function getDefaultDataLabelsOptions(dataLabelOptions, type, withStack = false) {
        var _a, _b, _c;
        const anchor = getAnchor(dataLabelOptions, type, withStack);
        const { offsetX = 0, offsetY = 0 } = dataLabelOptions;
        const formatter = isFunction(dataLabelOptions.formatter)
            ? dataLabelOptions.formatter
            : (value) => String(value) || '';
        const options = {
            anchor,
            offsetX,
            offsetY,
            formatter,
        };
        if (withStack) {
            const stackTotal = dataLabelOptions.stackTotal;
            options.stackTotal = {
                visible: isBoolean((_a = stackTotal) === null || _a === void 0 ? void 0 : _a.visible) ? stackTotal.visible : true,
                formatter: isFunction((_b = stackTotal) === null || _b === void 0 ? void 0 : _b.formatter) ? stackTotal.formatter : formatter,
            };
        }
        if (type === 'sector' && ((_c = dataLabelOptions.pieSeriesName) === null || _c === void 0 ? void 0 : _c.visible)) {
            options.pieSeriesName = Object.assign({ anchor: 'center' }, dataLabelOptions.pieSeriesName);
        }
        return options;
    }
    function makePointLabelInfo(point, dataLabelOptions, rect) {
        const { width, height } = rect;
        const { anchor, offsetX = 0, offsetY = 0, formatter } = dataLabelOptions;
        const { name, theme } = point;
        let textBaseline = 'middle';
        if (anchor === 'end') {
            textBaseline = 'bottom';
        }
        else if (anchor === 'start') {
            textBaseline = 'top';
        }
        const xWithOffset = point.x + offsetX;
        const yWithOffset = point.y + offsetY;
        const x = xWithOffset < 0 || xWithOffset > width ? point.x : xWithOffset;
        const y = yWithOffset < 0 || yWithOffset > height ? point.y : yWithOffset;
        return {
            type: 'point',
            x,
            y,
            text: formatter(point.value, point.data),
            textAlign: 'center',
            textBaseline,
            name,
            theme,
        };
    }
    function isHorizontal(direction) {
        return includes(['left', 'right'], direction);
    }
    function makeHorizontalRectPosition(rect, anchor) {
        const { x, y, width, height, direction } = rect;
        const textBaseline = 'middle';
        const posY = y + height / 2;
        let textAlign = 'center';
        let posX;
        if (direction === 'right') {
            switch (anchor) {
                case 'start':
                    textAlign = 'left';
                    posX = x;
                    break;
                case 'end':
                    textAlign = 'right';
                    posX = x + width;
                    break;
                case 'center':
                    textAlign = 'center';
                    posX = x + width / 2;
                    break;
                default:
                    textAlign = 'left';
                    posX = x + width;
            }
        }
        else {
            switch (anchor) {
                case 'start':
                    textAlign = 'right';
                    posX = x + width;
                    break;
                case 'end':
                    textAlign = 'left';
                    posX = x;
                    break;
                case 'center':
                    textAlign = 'center';
                    posX = x + width / 2;
                    break;
                default:
                    textAlign = 'right';
                    posX = x;
            }
        }
        return {
            x: posX,
            y: posY,
            textAlign,
            textBaseline,
        };
    }
    function makeVerticalRectPosition(rect, anchor) {
        const { x, y, width, height, direction } = rect;
        const textAlign = 'center';
        const posX = x + width / 2;
        let textBaseline = 'middle';
        let posY = 0;
        if (direction === 'top') {
            switch (anchor) {
                case 'end':
                    textBaseline = 'top';
                    posY = y;
                    break;
                case 'start':
                    textBaseline = 'bottom';
                    posY = y + height;
                    break;
                case 'center':
                    textBaseline = 'middle';
                    posY = y + height / 2;
                    break;
                default:
                    textBaseline = 'bottom';
                    posY = y;
            }
        }
        else {
            switch (anchor) {
                case 'end':
                    textBaseline = 'bottom';
                    posY = y + height;
                    break;
                case 'start':
                    textBaseline = 'top';
                    posY = y;
                    break;
                case 'center':
                    textBaseline = 'middle';
                    posY = y + height / 2;
                    break;
                default:
                    textBaseline = 'top';
                    posY = y + height;
                    break;
            }
        }
        return {
            x: posX,
            y: posY,
            textAlign,
            textBaseline,
        };
    }
    function adjustOverflowHorizontalRect(rect, dataLabelOptions, position) {
        const { width, value, direction, plot, theme } = rect;
        const { formatter } = dataLabelOptions;
        const font = getFont(theme);
        const text = isString(value) ? value : formatter(value);
        const textWidth = getTextWidth(text, font);
        let { x, textAlign } = position;
        const isOverflow = (direction === 'left' && x - textWidth < 0) || x + textWidth > plot.size;
        if (isOverflow) {
            x = rect.x + width;
            textAlign = 'right';
            if (direction === 'left' && width >= textWidth) {
                x = rect.x;
                textAlign = 'left';
            }
        }
        return {
            x,
            textAlign,
        };
    }
    function adjustOverflowVerticalRect(rect, dataLabelOptions, position) {
        const { height, direction, plot, theme, value } = rect;
        const font = getFont(theme);
        const plotSize = plot.size;
        const textHeight = getTextHeight(`${value}`, font); // @TODO: formatter 값해서 넘기기
        let { y, textBaseline } = position;
        const isOverflow = (!(direction === 'bottom') && y - textHeight < 0) || y + textHeight > plotSize;
        if (isOverflow) {
            y = rect.y;
            textBaseline = 'top';
            if (y + textHeight > plotSize) {
                y = rect.y;
                textBaseline = 'bottom';
            }
            if (direction === 'bottom') {
                y = rect.y + height;
                textBaseline = 'bottom';
            }
        }
        return {
            y,
            textBaseline,
        };
    }
    function makeHorizontalRectLabelInfo(rect, dataLabelOptions) {
        const { anchor, offsetX = 0, offsetY = 0 } = dataLabelOptions;
        const { direction, plot: { x: startOffsetX = 0, y: startOffsetY = 0 }, } = rect;
        const position = makeHorizontalRectPosition(rect, anchor);
        let { x: posX, y: posY, textAlign } = position;
        if (anchor === 'auto') {
            const adjustRect = adjustOverflowHorizontalRect(rect, dataLabelOptions, { x: posX, textAlign });
            posX = adjustRect.x;
            textAlign = adjustRect.textAlign;
        }
        posY += offsetY;
        if (direction === 'left') {
            posX = posX - offsetX;
        }
        else {
            posX = posX + offsetX;
        }
        const padding = 10;
        if (textAlign === 'right') {
            posX -= padding;
        }
        else if (textAlign === 'left') {
            posX += padding;
        }
        posX -= startOffsetX;
        posY -= startOffsetY;
        return {
            x: posX,
            y: posY,
            textAlign,
            textBaseline: position.textBaseline,
        };
    }
    function makeVerticalRectLabelInfo(rect, dataLabelOptions) {
        const { anchor, offsetX = 0, offsetY = 0 } = dataLabelOptions;
        const { direction, plot: { x: startOffsetX = 0, y: startOffsetY = 0 }, } = rect;
        const position = makeVerticalRectPosition(rect, anchor);
        let { x: posX, y: posY, textBaseline } = position;
        if (anchor === 'auto') {
            const adjustRect = adjustOverflowVerticalRect(rect, dataLabelOptions, position);
            posY = adjustRect.y;
            textBaseline = adjustRect.textBaseline;
        }
        posX += offsetX;
        if (direction === 'top') {
            posY = posY + offsetY;
        }
        else if (direction === 'bottom') {
            posY = posY - offsetY;
        }
        const padding = 5;
        if (textBaseline === 'bottom') {
            posY -= padding;
        }
        else if (textBaseline === 'top') {
            posY += padding;
        }
        posX -= startOffsetX;
        posY -= startOffsetY;
        return {
            x: posX,
            y: posY,
            textAlign: position.textAlign,
            textBaseline,
        };
    }
    function makeRectLabelInfo(rect, dataLabelOptions) {
        const { type, value, direction, name, theme } = rect;
        const horizontal = isHorizontal(direction);
        const labelPosition = horizontal
            ? makeHorizontalRectLabelInfo(rect, dataLabelOptions)
            : makeVerticalRectLabelInfo(rect, dataLabelOptions);
        const formatter = type === 'stackTotal' ? dataLabelOptions.stackTotal.formatter : dataLabelOptions.formatter;
        return Object.assign(Object.assign({ type }, labelPosition), { text: isString(value) ? value : formatter(value), name, seriesColor: rect.color, theme });
    }
    function makeSectorLabelPosition(model, dataLabelOptions) {
        const anchor = dataLabelOptions.anchor;
        const position = getRadialAnchorPosition(makeAnchorPositionParam(anchor, Object.assign(Object.assign({}, model), { radius: Object.assign(Object.assign({}, model.radius), { outer: anchor === 'outer' ? model.radius.outer + RADIUS_PADDING : model.radius.outer }) })));
        const textAlign = getRadialLabelAlign(model, anchor);
        return Object.assign(Object.assign({}, position), { textAlign, textBaseline: hasSameAnchorPieDataLabel(dataLabelOptions) ? 'bottom' : 'middle' });
    }
    function makeSectorBarLabelPosition(model, dataLabelOptions) {
        const { anchor } = dataLabelOptions;
        const { clockwise, degree: { start, end }, radius: { inner, outer }, } = model;
        let startAngle = start;
        let endAngle = end;
        let textAlign = 'center';
        let rotationDegree = (start + end) / 2;
        if (anchor === 'start') {
            textAlign = clockwise ? 'left' : 'right';
            endAngle = startAngle;
            rotationDegree = start;
        }
        else if (anchor === 'end') {
            textAlign = clockwise ? 'right' : 'left';
            startAngle = endAngle;
            rotationDegree = end;
        }
        const { x, y } = getRadialAnchorPosition(makeAnchorPositionParam(anchor, Object.assign(Object.assign({}, model), { degree: {
                start: startAngle,
                end: endAngle,
            }, radius: {
                inner: inner,
                outer: outer,
            } })));
        return {
            x,
            y,
            textAlign,
            textBaseline: 'middle',
            radian: calculateDegreeToRadian(rotationDegree, 0),
        };
    }
    function makeSectorBarLabelInfo(model, dataLabelOptions) {
        const { formatter } = dataLabelOptions;
        const labelPosition = makeSectorBarLabelPosition(model, dataLabelOptions);
        const { value, name, theme: dataLabelTheme } = model;
        const theme = Object.assign(Object.assign({}, dataLabelTheme), { color: dataLabelTheme.useSeriesColor ? model.color : dataLabelTheme.color });
        return Object.assign(Object.assign({ type: 'sector' }, labelPosition), { text: formatter(value), name,
            theme });
    }
    function makeSectorLabelInfo(model, dataLabelOptions) {
        const { formatter } = dataLabelOptions;
        const labelPosition = makeSectorLabelPosition(model, dataLabelOptions);
        const { value, name, theme: dataLabelTheme } = model;
        const anchor = dataLabelOptions.anchor;
        const theme = Object.assign(Object.assign({}, dataLabelTheme), { color: dataLabelTheme.useSeriesColor ? model.color : dataLabelTheme.color });
        return Object.assign(Object.assign({ type: 'sector' }, labelPosition), { text: formatter(value), name, callout: hasSectorCallout(dataLabelOptions) ? getPieDataLabelCallout(model, anchor) : null, theme });
    }
    function makePieSeriesNameLabelInfo(model, dataLabelOptions) {
        var _a;
        const seriesNameAnchor = (_a = dataLabelOptions.pieSeriesName) === null || _a === void 0 ? void 0 : _a.anchor;
        const hasOuterAnchor = seriesNameAnchor === 'outer';
        const position = getRadialAnchorPosition(makeAnchorPositionParam(seriesNameAnchor, Object.assign(Object.assign({}, model), { radius: Object.assign(Object.assign({}, model.radius), { outer: hasOuterAnchor ? model.radius.outer + RADIUS_PADDING : model.radius.outer }) })));
        const textAlign = getRadialLabelAlign(model, seriesNameAnchor);
        const pieSeriesNameTheme = model.theme.pieSeriesName;
        const theme = Object.assign(Object.assign({}, pieSeriesNameTheme), { color: pieSeriesNameTheme.useSeriesColor ? model.color : pieSeriesNameTheme.color });
        return Object.assign(Object.assign({ type: 'pieSeriesName' }, position), { text: model.name, callout: hasPieSeriesNameCallout(dataLabelOptions)
                ? getPieDataLabelCallout(model, seriesNameAnchor)
                : null, textAlign, textBaseline: hasSameAnchorPieDataLabel(dataLabelOptions) ? 'top' : 'middle', theme });
    }
    function getDataLabelsOptions(options, name) {
        var _a, _b, _c, _d, _e;
        return ((_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b[name]) === null || _c === void 0 ? void 0 : _c.dataLabels) || ((_e = (_d = options) === null || _d === void 0 ? void 0 : _d.series) === null || _e === void 0 ? void 0 : _e.dataLabels) || {};
    }
    function makeLineLabelInfo(model, dataLabelOptions) {
        const { value, textAlign, textBaseline } = model;
        const { formatter } = dataLabelOptions;
        return Object.assign(Object.assign({}, model), { x: model.x, y: (model.y + model.y2) / 2, textAlign: (textAlign !== null && textAlign !== void 0 ? textAlign : 'center'), textBaseline: (textBaseline !== null && textBaseline !== void 0 ? textBaseline : 'middle'), text: isString(value) ? value : formatter(value) });
    }
    function hasSameAnchorPieDataLabel(dataLabelOptions) {
        var _a;
        return dataLabelOptions.anchor === ((_a = dataLabelOptions.pieSeriesName) === null || _a === void 0 ? void 0 : _a.anchor);
    }
    function hasSectorCallout(dataLabelOptions) {
        var _a;
        return dataLabelOptions.anchor === 'outer' || ((_a = dataLabelOptions.pieSeriesName) === null || _a === void 0 ? void 0 : _a.anchor) !== 'outer';
    }
    function hasPieSeriesNameCallout(dataLabelOptions) {
        var _a;
        return dataLabelOptions.anchor !== 'outer' || ((_a = dataLabelOptions.pieSeriesName) === null || _a === void 0 ? void 0 : _a.anchor) === 'outer';
    }
    function getPieDataLabelCallout(model, anchor) {
        if (anchor !== 'outer') {
            return null;
        }
        const { x, y } = getRadialAnchorPosition(makeAnchorPositionParam('outer', Object.assign(Object.assign({}, model), { radius: Object.assign(Object.assign({}, model.radius), { outer: model.radius.outer + CALLOUT_LENGTH }) })));
        const { x: x2, y: y2 } = getRadialAnchorPosition(makeAnchorPositionParam('outer', Object.assign({}, model)));
        const { callout } = model.theme;
        const theme = Object.assign(Object.assign({}, callout), { lineColor: callout.useSeriesColor ? model.color : callout.lineColor });
        return { x, y, x2, y2, theme };
    }

    class LineSeries extends Component {
        constructor() {
            super(...arguments);
            this.models = { rect: [], series: [], dot: [] };
            this.activatedResponders = [];
            this.eventDetectType = 'nearest';
            this.yAxisName = 'yAxis';
            this.onMouseoutComponent = () => {
                this.eventBus.emit('seriesPointHovered', { models: [], name: this.name });
                this.eventBus.emit('renderHoveredSeries', {
                    models: [],
                    name: this.name,
                    eventDetectType: this.eventDetectType,
                });
                this.eventBus.emit('needDraw');
            };
            this.selectSeries = (info) => {
                const { index, seriesIndex } = info;
                if (!isAvailableSelectSeries(info, 'line')) {
                    return;
                }
                const category = this.getResponderCategoryByIndex(index);
                if (!category) {
                    throw new Error(message.SELECT_SERIES_API_INDEX_ERROR);
                }
                const model = this.tooltipCircleMap[category][seriesIndex];
                if (!model) {
                    throw new Error(message.SELECT_SERIES_API_INDEX_ERROR);
                }
                const models = this.getResponderSeriesWithTheme([model], 'select');
                this.eventBus.emit('renderSelectedSeries', { models, name: this.name });
                this.eventBus.emit('needDraw');
            };
            this.showTooltip = (info) => {
                var _a;
                const { index, seriesIndex } = info;
                if (!isAvailableShowTooltipInfo(info, this.eventDetectType, 'line')) {
                    return;
                }
                const category = this.getResponderCategoryByIndex(index);
                if (!category) {
                    return;
                }
                const models = this.eventDetectType === 'grouped'
                    ? this.tooltipCircleMap[category]
                    : [this.tooltipCircleMap[category][seriesIndex]];
                if (!((_a = models) === null || _a === void 0 ? void 0 : _a.length)) {
                    return;
                }
                this.onMousemoveNearType(models);
                this.eventBus.emit('seriesPointHovered', { models: this.activatedResponders, name: this.name });
                this.eventBus.emit('needDraw');
            };
        }
        initialize() {
            this.type = 'series';
            this.name = 'line';
            this.eventBus.on('selectSeries', this.selectSeries);
            this.eventBus.on('showTooltip', this.showTooltip);
            this.eventBus.on('hideTooltip', this.onMouseoutComponent);
        }
        initUpdate(delta) {
            this.drawModels.rect[0].width = this.models.rect[0].width * delta;
        }
        setEventDetectType(series, options) {
            var _a, _b;
            if (series.area || series.column) {
                this.eventDetectType = 'grouped';
            }
            if ((_b = (_a = options) === null || _a === void 0 ? void 0 : _a.series) === null || _b === void 0 ? void 0 : _b.eventDetectType) {
                this.eventDetectType = options.series.eventDetectType;
            }
            if (series.scatter) {
                this.eventDetectType = 'near';
            }
        }
        render(chartState, computed) {
            var _a, _b, _c, _d, _e, _f;
            const { viewRange } = computed;
            const { layout, series, scale, axes, legend, theme } = chartState;
            if (!series.line) {
                throw new Error(message.noDataError(this.name));
            }
            const categories = (_a = chartState.categories, (_a !== null && _a !== void 0 ? _a : []));
            const rawCategories = (_b = chartState.rawCategories, (_b !== null && _b !== void 0 ? _b : []));
            const options = Object.assign({}, chartState.options);
            if (((_c = options) === null || _c === void 0 ? void 0 : _c.series) && 'line' in options.series) {
                options.series = Object.assign(Object.assign({}, options.series), options.series.line);
            }
            this.setEventDetectType(series, options);
            const labelAxisData = axes.xAxis;
            const seriesOptions = (_d = options.series, (_d !== null && _d !== void 0 ? _d : {}));
            const lineSeriesData = series.line.data;
            this.theme = theme.series.line;
            this.rect = layout.plot;
            this.activeSeriesMap = getActiveSeriesMap(legend);
            this.startIndex = (_f = (_e = viewRange) === null || _e === void 0 ? void 0 : _e[0], (_f !== null && _f !== void 0 ? _f : 0));
            this.selectable = this.getSelectableOption(options);
            this.yAxisName = getValueAxisName(options, this.name, 'yAxis');
            const lineSeriesModel = this.renderLinePointsModel(lineSeriesData, scale, labelAxisData, seriesOptions, categories);
            const { dotSeriesModel, responderModel } = this.renderCircleModel(lineSeriesModel, seriesOptions);
            const tooltipDataArr = this.makeTooltipData(lineSeriesData, categories);
            this.tooltipCircleMap = makeTooltipCircleMap(responderModel, tooltipDataArr);
            this.models = {
                rect: [this.renderClipRectAreaModel()],
                series: lineSeriesModel,
                dot: dotSeriesModel,
            };
            if (!this.drawModels) {
                this.drawModels = Object.assign(Object.assign({}, this.models), { rect: [this.renderClipRectAreaModel(true)] });
            }
            if (getDataLabelsOptions(options, this.name).visible) {
                this.renderDataLabels(this.getDataLabels(lineSeriesModel));
            }
            const coordinateType = isCoordinateSeries(series);
            this.responders = this.getResponders({
                labelAxisData,
                responderModel,
                tooltipDataArr,
                categories,
                rawCategories,
                coordinateType,
            });
        }
        getResponders({ labelAxisData, responderModel, tooltipDataArr, categories, rawCategories, coordinateType, }) {
            if (this.eventDetectType === 'near') {
                return this.makeNearTypeResponderModel(responderModel, tooltipDataArr, rawCategories);
            }
            if (this.eventDetectType === 'point') {
                return this.makeNearTypeResponderModel(responderModel, tooltipDataArr, rawCategories, 0);
            }
            if (coordinateType) {
                const rectResponderInfo = this.getRectResponderInfoForCoordinateType(responderModel, rawCategories);
                return makeRectResponderModelForCoordinateType(rectResponderInfo, this.rect);
            }
            return makeRectResponderModel(this.rect, labelAxisData, categories);
        }
        makeNearTypeResponderModel(seriesCircleModel, tooltipDataArr, categories, detectionSize) {
            return seriesCircleModel.map((m, index) => (Object.assign(Object.assign({}, m), { data: tooltipDataArr[index], detectionSize, label: categories[m.index] })));
        }
        makeTooltipData(lineSeriesData, categories) {
            return lineSeriesData.flatMap(({ rawData, name, color }, seriesIndex) => {
                return rawData.map((datum, index) => isNull(datum)
                    ? {}
                    : {
                        label: name,
                        color,
                        value: getCoordinateYValue(datum),
                        category: categories[getCoordinateDataIndex(datum, categories, index, this.startIndex)],
                        seriesIndex,
                        index,
                    });
            });
        }
        renderClipRectAreaModel(isDrawModel) {
            return {
                type: 'clipRectArea',
                x: 0,
                y: 0,
                width: isDrawModel ? 0 : this.rect.width,
                height: this.rect.height,
            };
        }
        renderLinePointsModel(seriesRawData, scale, axisData, options, categories) {
            const { spline } = options;
            const yAxisLimit = scale[this.yAxisName].limit;
            const { lineWidth, dashSegments } = this.theme;
            return seriesRawData.map(({ rawData, name, color: seriesColor }, seriesIndex) => {
                const points = [];
                const active = this.activeSeriesMap[name];
                rawData.forEach((datum, idx) => {
                    if (isNull(datum)) {
                        return points.push(null);
                    }
                    const value = getCoordinateYValue(datum);
                    const yValueRatio = getValueRatio(value, yAxisLimit);
                    const y = (1 - yValueRatio) * this.rect.height;
                    const x = getXPosition(axisData, this.rect.width, getCoordinateXValue(datum), getCoordinateDataIndex(datum, categories, idx, this.startIndex));
                    points.push({ x, y, value });
                });
                if (spline) {
                    setSplineControlPoint(points);
                }
                return {
                    type: 'linePoints',
                    points,
                    seriesIndex,
                    name,
                    color: getRGBA(seriesColor, active ? 1 : 0.3),
                    lineWidth,
                    dashSegments,
                };
            });
        }
        getRectResponderInfoForCoordinateType(circleModel, categories) {
            const duplicateCheckMap = {};
            const modelInRange = circleModel.filter(({ x }) => x >= 0 && x <= this.rect.width);
            return modelInRange.reduce((acc, model) => {
                const { index, x } = model;
                if (!duplicateCheckMap[x]) {
                    const label = categories[index];
                    duplicateCheckMap[x] = true;
                    acc.push({ x, label });
                }
                return acc;
            }, []);
        }
        renderCircleModel(lineSeriesModel, options) {
            const dotSeriesModel = [];
            const responderModel = [];
            const showDot = !!options.showDot;
            const { hover, dot: dotTheme } = this.theme;
            const hoverDotTheme = hover.dot;
            lineSeriesModel.forEach(({ color, name, points }, seriesIndex) => {
                const active = this.activeSeriesMap[name];
                points.forEach((point, index) => {
                    var _a, _b;
                    if (isNull(point)) {
                        return;
                    }
                    const { x, y } = point;
                    const model = { type: 'circle', x, y, seriesIndex, name, index };
                    if (showDot) {
                        dotSeriesModel.push(Object.assign(Object.assign({}, model), { radius: dotTheme.radius, color: getRGBA(color, active ? 1 : 0.3), style: [
                                { lineWidth: dotTheme.borderWidth, strokeStyle: (_a = dotTheme.borderColor, (_a !== null && _a !== void 0 ? _a : color)) },
                            ] }));
                    }
                    responderModel.push(Object.assign(Object.assign({}, model), { radius: hoverDotTheme.radius, color: (_b = hoverDotTheme.color, (_b !== null && _b !== void 0 ? _b : getRGBA(color, 1))), style: ['default'] }));
                });
            });
            return { dotSeriesModel, responderModel };
        }
        getCircleModelsFromRectResponders(responders, mousePositions) {
            var _a, _b;
            if (!responders.length || !responders[0].label) {
                return [];
            }
            const models = (_b = this.tooltipCircleMap[(_a = responders[0]) === null || _a === void 0 ? void 0 : _a.label], (_b !== null && _b !== void 0 ? _b : []));
            return this.eventDetectType === 'grouped'
                ? models
                : getNearestResponder(models, mousePositions, this.rect);
        }
        onMousemoveNearType(responders) {
            this.eventBus.emit('renderHoveredSeries', {
                models: this.getResponderSeriesWithTheme(responders, 'hover'),
                name: this.name,
                eventDetectType: this.eventDetectType,
            });
            this.activatedResponders = responders;
        }
        onMousemoveNearestType(responders, mousePositions) {
            const circleModels = this.getCircleModelsFromRectResponders(responders, mousePositions);
            this.onMousemoveNearType(circleModels);
        }
        onMousemoveGroupedType(responders) {
            const circleModels = this.getCircleModelsFromRectResponders(responders);
            this.onMousemoveNearType(circleModels);
        }
        onMousemove({ responders, mousePosition }) {
            if (this.eventDetectType === 'nearest') {
                this.onMousemoveNearestType(responders, mousePosition);
            }
            else if (includes(['near', 'point'], this.eventDetectType)) {
                this.onMousemoveNearType(responders);
            }
            else {
                this.onMousemoveGroupedType(responders);
            }
            this.eventBus.emit('seriesPointHovered', { models: this.activatedResponders, name: this.name });
            this.eventBus.emit('needDraw');
        }
        getDataLabels(seriesModels) {
            const dataLabelTheme = this.theme.dataLabels;
            return seriesModels.flatMap(({ points, name, color }) => points.map((point) => isNull(point)
                ? {}
                : Object.assign(Object.assign({ type: 'point' }, point), { name, theme: Object.assign(Object.assign({}, dataLabelTheme), { color: dataLabelTheme.useSeriesColor ? color : dataLabelTheme.color }) })));
        }
        getResponderSeriesWithTheme(models, type) {
            const { radius, color, borderWidth, borderColor } = this.theme[type].dot;
            return models.map((model) => {
                const modelColor = (color !== null && color !== void 0 ? color : model.color);
                return Object.assign(Object.assign({}, model), { radius, color: modelColor, style: [{ lineWidth: borderWidth, strokeStyle: (borderColor !== null && borderColor !== void 0 ? borderColor : getRGBA(modelColor, 0.5)) }] });
            });
        }
        onClick({ responders, mousePosition }) {
            if (this.selectable) {
                let models;
                if (this.eventDetectType === 'near') {
                    models = responders;
                }
                else {
                    models = this.getCircleModelsFromRectResponders(responders, mousePosition);
                }
                this.eventBus.emit('renderSelectedSeries', {
                    models: this.getResponderSeriesWithTheme(models, 'select'),
                    name: this.name,
                });
                this.eventBus.emit('needDraw');
            }
        }
        getResponderCategoryByIndex(index) {
            var _a, _b;
            const responder = Object.values(this.tooltipCircleMap)
                .flatMap((val) => val)
                .find((model) => model.index === index);
            return (_b = (_a = responder) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.category;
        }
    }

    class Legend extends Component {
        constructor() {
            super(...arguments);
            this.activatedResponders = [];
            this.seriesColorMap = {};
            this.seriesIconTypeMap = {};
            this.onClickCheckbox = (responders) => {
                const { label, checked } = responders[0];
                this.store.dispatch('setAllLegendActiveState', true);
                this.store.dispatch('setLegendCheckedState', { name: label, checked: !checked });
                if (checked) {
                    this.store.dispatch('disableSeries', label);
                }
                else {
                    this.store.dispatch('enableSeries', label);
                }
                this.eventBus.emit('needDraw');
            };
            this.onClickLabel = (responders) => {
                const { label } = responders[0];
                this.eventBus.emit('resetSelectedSeries');
                if (this.activatedResponders.length && this.activatedResponders[0].label === label) {
                    this.store.dispatch('setAllLegendActiveState', true);
                    this.activatedResponders = [];
                }
                else {
                    this.store.dispatch('setAllLegendActiveState', false);
                    this.store.dispatch('setLegendActiveState', { name: label, active: true });
                    this.activatedResponders = responders;
                }
                this.eventBus.emit('needDraw');
            };
        }
        onClick({ responders }) {
            var _a;
            if (responders.length) {
                const { data } = responders[0];
                if (((_a = data) === null || _a === void 0 ? void 0 : _a.name) === 'checkbox') {
                    this.eventBus.emit('clickLegendCheckbox', makeObservableObjectToNormal(responders));
                }
                else {
                    this.eventBus.emit('clickLegendLabel', makeObservableObjectToNormal(responders));
                }
            }
        }
        initialize() {
            this.type = 'legend';
            this.name = 'legend';
            this.eventBus.on('clickLegendCheckbox', this.onClickCheckbox);
            this.eventBus.on('clickLegendLabel', this.onClickLabel);
        }
        initColorAndIconTypeMap(legendData) {
            this.seriesColorMap = {};
            this.seriesIconTypeMap = {};
            legendData.forEach(({ label, color, iconType }) => {
                this.seriesColorMap[label] = color;
                this.seriesIconTypeMap[label] = iconType;
            });
        }
        getXPositionWhenVerticalAlign(data) {
            const { offset, rowWidths } = data.reduce((acc, datum) => {
                const { rowIndex, columnIndex, width } = datum;
                if (isUndefined(acc.rowWidths[rowIndex])) {
                    acc.rowWidths[rowIndex] = 0;
                    acc.offset[rowIndex] = [0];
                }
                acc.rowWidths[rowIndex] += width + (columnIndex ? LEGEND_ITEM_MARGIN_X : 0);
                acc.offset[rowIndex][columnIndex + 1] =
                    acc.offset[rowIndex][columnIndex] + LEGEND_ITEM_MARGIN_X + width;
                return acc;
            }, { offset: [], rowWidths: [] });
            const { width } = this.rect;
            rowWidths.forEach((rowWidth, rowIndex) => {
                const xMargin = (width - rowWidth) / 2;
                offset[rowIndex] = offset[rowIndex].map((xOffset) => xOffset + xMargin);
            });
            return offset;
        }
        getXPositionWhenHorizontalAlign(data) {
            const maxWidths = data.reduce((acc, datum) => {
                const { columnIndex, width } = datum;
                if (isUndefined(acc[columnIndex])) {
                    acc[columnIndex] = 0;
                }
                acc[columnIndex] = Math.max(acc[columnIndex], width);
                return acc;
            }, []);
            return data.reduce((acc, datum) => {
                const { rowIndex, columnIndex } = datum;
                if (isUndefined(acc[rowIndex])) {
                    acc[rowIndex] = [0];
                }
                acc[rowIndex][columnIndex + 1] =
                    acc[rowIndex][columnIndex] + LEGEND_ITEM_MARGIN_X + maxWidths[columnIndex];
                return acc;
            }, []);
        }
        renderLegendModel(legend) {
            const { data, showCheckbox, align, useScatterChartIcon } = legend;
            const verticalAlign = isVerticalAlign(align);
            const itemHeight = getLegendItemHeight(this.theme.label.fontSize);
            const xPosition = verticalAlign
                ? this.getXPositionWhenVerticalAlign(data)
                : this.getXPositionWhenHorizontalAlign(data);
            return [
                Object.assign({ type: 'legend', align,
                    showCheckbox, data: data.map((datum) => {
                        var _a;
                        const { label, iconType, rowIndex, columnIndex } = datum;
                        return Object.assign(Object.assign({}, datum), { iconType: (_a = this.seriesIconTypeMap[label], (_a !== null && _a !== void 0 ? _a : iconType)), color: this.seriesColorMap[label], x: xPosition[rowIndex][columnIndex], y: padding.Y + itemHeight * rowIndex, useScatterChartIcon });
                    }) }, this.theme.label),
            ];
        }
        makeCheckboxResponder(data, showCheckbox) {
            return showCheckbox
                ? data.map((m) => (Object.assign(Object.assign({}, m), { type: 'rect', x: m.x, y: m.y, width: LEGEND_CHECKBOX_SIZE, height: LEGEND_CHECKBOX_SIZE, data: { name: 'checkbox' } })))
                : [];
        }
        makeLabelResponder(data, showCheckbox) {
            const font = getTitleFontString(this.theme.label);
            return data.map((m) => (Object.assign(Object.assign({}, m), { type: 'rect', x: m.x +
                    (showCheckbox ? LEGEND_CHECKBOX_SIZE + LEGEND_MARGIN_X : 0) +
                    LEGEND_ICON_SIZE +
                    LEGEND_MARGIN_X, y: m.y, width: getTextWidth(m.label, font), data: { name: 'label' }, height: LEGEND_CHECKBOX_SIZE })));
        }
        render({ layout, legend, theme }) {
            this.isShow = legend.visible && !!legend.data.length;
            if (!this.isShow) {
                return;
            }
            // @TODO: stack 일 떄 라벨 순서 역순으로(스택이 쌓인 순서대로) 되어야
            const { showCheckbox, data: legendData } = legend;
            this.rect = layout.legend;
            this.theme = theme.legend;
            this.initColorAndIconTypeMap(legendData);
            this.models = this.renderLegendModel(legend);
            const { data } = this.models[0];
            const checkboxResponder = this.makeCheckboxResponder(data, showCheckbox);
            const labelResponder = this.makeLabelResponder(data, showCheckbox);
            this.responders = [...checkboxResponder, ...labelResponder];
        }
    }

    function getLabelInfo(model, labelOptions, rect, name) {
        var _a;
        const { type } = model;
        const dataLabel = [];
        if (type === 'point') {
            dataLabel.push(makePointLabelInfo(model, labelOptions, rect));
        }
        else if (type === 'sector') {
            if (name === 'radialBar') {
                dataLabel.push(makeSectorBarLabelInfo(model, labelOptions));
            }
            else {
                dataLabel.push(makeSectorLabelInfo(model, labelOptions));
                if ((_a = labelOptions.pieSeriesName) === null || _a === void 0 ? void 0 : _a.visible) {
                    const seriesNameLabel = makePieSeriesNameLabelInfo(model, labelOptions);
                    dataLabel.push(seriesNameLabel);
                }
            }
        }
        else if (type === 'line') {
            dataLabel.push(makeLineLabelInfo(model, labelOptions));
        }
        else {
            dataLabel.push(makeRectLabelInfo(model, labelOptions));
        }
        return dataLabel;
    }
    class DataLabels extends Component {
        constructor() {
            super(...arguments);
            this.dataLabelsMap = {};
            this.renderSeriesDataLabels = (seriesDataLabel) => {
                this.appendDataLabels(seriesDataLabel);
                this.models = this.renderLabelModel();
                if (!this.drawModels) {
                    this.drawModels = this.getDrawModelsAppliedOpacity(0);
                }
                else {
                    this.sync();
                }
            };
        }
        initialize() {
            this.type = 'dataLabels';
            this.name = 'dataLabels';
            this.eventBus.on('renderDataLabels', this.renderSeriesDataLabels);
        }
        initUpdate(delta) {
            if (!this.drawModels) {
                return;
            }
            this.drawModels = this.getDrawModelsAppliedOpacity(delta);
        }
        render({ layout, options, series, nestedPieSeries }) {
            this.rect = layout.plot;
            this.options = options;
            this.isShow = this.visibleDataLabels(series, nestedPieSeries);
        }
        visibleDataLabels(series, nestedPieSeries) {
            var _a, _b;
            const visibleCommonSeriesDataLabels = !!((_b = (_a = this.options.series) === null || _a === void 0 ? void 0 : _a.dataLabels) === null || _b === void 0 ? void 0 : _b.visible);
            const visibleComboSeriesDataLabels = Object.keys(series).some((seriesName) => { var _a, _b, _c; return !!((_c = (_b = (_a = this.options.series) === null || _a === void 0 ? void 0 : _a[seriesName]) === null || _b === void 0 ? void 0 : _b.dataLabels) === null || _c === void 0 ? void 0 : _c.visible); });
            const visibleNestedPieSeriesDataLabels = !!(nestedPieSeries &&
                Object.keys(nestedPieSeries).some((alias) => {
                    var _a, _b, _c;
                    return !!((_c = (_b = (_a = this.options.series) === null || _a === void 0 ? void 0 : _a[alias]) === null || _b === void 0 ? void 0 : _b.dataLabels) === null || _c === void 0 ? void 0 : _c.visible);
                }));
            return (visibleCommonSeriesDataLabels ||
                visibleComboSeriesDataLabels ||
                visibleNestedPieSeriesDataLabels);
        }
        appendDataLabels({ name, data }) {
            const dataLabelOptions = getDataLabelsOptions(this.options, name);
            const withStack = !!pickStackOption(this.options);
            const labels = [];
            data.forEach((model) => {
                var _a;
                const { type, value } = model;
                const labelOptions = getDefaultDataLabelsOptions(dataLabelOptions, type, withStack);
                const disableStackTotal = type === 'stackTotal' && !((_a = labelOptions.stackTotal) === null || _a === void 0 ? void 0 : _a.visible);
                if (disableStackTotal || isUndefined(value)) {
                    return;
                }
                labels.splice(labels.length, 0, ...getLabelInfo(model, labelOptions, this.rect, name));
            });
            this.dataLabelsMap[name] = { data: labels, options: dataLabelOptions };
        }
        getDrawModelsAppliedOpacity(opacity) {
            return Object.keys(this.models).reduce((acc, key) => (Object.assign(Object.assign({}, acc), { [key]: this.models[key].map((m) => (Object.assign(Object.assign({}, m), { opacity }))) })), { series: [], total: [] });
        }
        renderLabelModel() {
            return Object.keys(this.dataLabelsMap)
                .map((seriesName) => {
                const { data } = this.dataLabelsMap[seriesName];
                return this.makeLabelModel(data);
            })
                .reduce((acc, cur) => ({
                series: [...acc.series, ...cur.series],
                total: [...acc.total, ...cur.total],
            }), { series: [], total: [] });
        }
        makeLabelModel(dataLabels) {
            return dataLabels.reduce((acc, dataLabel) => {
                var _a;
                const { type, x, y, text, textAlign, textBaseline, name, callout, theme, radian, } = dataLabel;
                if (!isModelExistingInRect(this.rect, { x, y })) {
                    return acc;
                }
                const modelName = type === 'stackTotal' ? 'total' : 'series';
                return Object.assign(Object.assign({}, acc), { [modelName]: [
                        ...(_a = acc[modelName], (_a !== null && _a !== void 0 ? _a : [])),
                        {
                            type: 'dataLabel',
                            dataLabelType: type,
                            text,
                            x,
                            y,
                            textAlign,
                            textBaseline,
                            opacity: 1,
                            name,
                            callout,
                            theme,
                            radian,
                        },
                    ] });
            }, { series: [], total: [] });
        }
    }

    class AxisTitle extends Component {
        initialize({ name }) {
            this.type = 'axisTitle';
            this.name = name;
            this.isYAxis = includes([AxisType.Y, AxisType.SECONDARY_Y], name);
            this.isCircularAxis = this.name === AxisType.CIRCULAR;
        }
        getTitlePosition(offsetX, offsetY) {
            if (this.isCircularAxis) {
                return [this.rect.width / 2 + offsetX, this.rect.height / 2 + offsetY];
            }
            return this.isYAxis
                ? [this.name === AxisType.Y ? offsetX : this.rect.width + offsetX, offsetY]
                : [this.rect.width + offsetX, offsetY];
        }
        renderAxisTitle(option, textAlign) {
            const { text, offsetX, offsetY } = option;
            const [x, y] = this.getTitlePosition(offsetX, offsetY);
            const font = getTitleFontString(this.theme);
            const fillStyle = this.theme.color;
            return [
                {
                    type: 'label',
                    text,
                    x,
                    y,
                    style: ['axisTitle', { textAlign, fillStyle, font }],
                },
            ];
        }
        getTextAlign(hasCenterYAxis = false) {
            if (this.name === AxisType.Y) {
                return hasCenterYAxis ? 'center' : 'left';
            }
            if (this.isCircularAxis) {
                return 'center';
            }
            return 'right';
        }
        getCircularAxisTitleRect(option, plotRect, circularAxisData) {
            const { x, y } = plotRect;
            const { centerX, centerY, axisSize, radius: { outer: outerRadius }, } = circularAxisData;
            const { offsetY } = option;
            return {
                x: centerX + x - axisSize / 2,
                y: centerY + y - outerRadius / 2,
                width: axisSize,
                height: this.theme.fontSize + offsetY,
            };
        }
        render({ axes, radialAxes, layout, theme }) {
            var _a, _b, _c;
            const titleOption = this.isCircularAxis ? (_a = radialAxes[this.name]) === null || _a === void 0 ? void 0 : _a.title : (_b = axes[this.name]) === null || _b === void 0 ? void 0 : _b.title;
            this.isShow = !!titleOption;
            if (!this.isShow) {
                return;
            }
            this.theme = getAxisTheme(theme, this.name).title;
            this.rect = layout[`${this.name}Title`];
            this.models = this.renderAxisTitle(titleOption, this.getTextAlign(!!((_c = axes) === null || _c === void 0 ? void 0 : _c.centerYAxis)));
        }
    }

    class Title extends Component {
        initialize() {
            this.type = 'title';
            this.name = 'title';
        }
        renderTitle(options) {
            var _a, _b, _c;
            let text = '';
            let x = 0;
            let y = 0;
            let align = 'left';
            if (isString(options)) {
                text = options;
            }
            else {
                text = options.text;
                align = (_a = options.align, (_a !== null && _a !== void 0 ? _a : 'left'));
                x += (_b = options.offsetX, (_b !== null && _b !== void 0 ? _b : 0));
                y += (_c = options.offsetY, (_c !== null && _c !== void 0 ? _c : 0));
            }
            const font = getTitleFontString(this.theme);
            const textWidth = getTextWidth(text, font);
            if (align === 'center') {
                x += (this.rect.width - textWidth) / 2;
            }
            else if (align === 'right') {
                x += this.rect.width - textWidth;
            }
            return [
                {
                    type: 'label',
                    x,
                    y,
                    text,
                    style: ['title', { font, fillStyle: this.theme.color }],
                },
            ];
        }
        render({ options, layout, theme }) {
            var _a;
            this.isShow = !!((_a = options.chart) === null || _a === void 0 ? void 0 : _a.title);
            if (!this.isShow) {
                return;
            }
            this.theme = theme.title;
            this.rect = layout.title;
            this.models = this.renderTitle(options.chart.title);
        }
    }

    var __rest = (undefined && undefined.__rest) || function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };
    const guideLineType = {
        line: 'circle',
        area: 'circle',
        boxPlot: 'boxPlot',
    };
    class HoveredSeries extends Component {
        constructor() {
            super(...arguments);
            this.models = { guideLine: [] };
            this.isShow = false;
            this.renderHoveredSeries = ({ models, name, eventDetectType, }) => {
                var _a, _b;
                const prevModels = this.getSeriesModels(name);
                this.models[name] = [...models];
                this.isShow = !!this.getSeriesModels().length;
                const isSame = !!((_a = prevModels) === null || _a === void 0 ? void 0 : _a.length) &&
                    !!models.length &&
                    isSameSeriesResponder({ models, comparisonModel: prevModels, eventDetectType, name });
                if (((_b = prevModels) === null || _b === void 0 ? void 0 : _b.length) && !models.length) {
                    this.eventBus.emit('unhoverSeries', makeObservableObjectToNormal(prevModels));
                }
                else if (models.length && !isSame) {
                    this.eventBus.emit('hoverSeries', makeObservableObjectToNormal(models));
                }
                this.modelForGuideLine = this.getModelForGuideLine(name);
                if (eventDetectType === 'grouped') {
                    this.renderGroupedModels(name);
                }
            };
            this.resetHoveredSeries = () => {
                this.models = { guideLine: [] };
            };
        }
        getSeriesModels(type) {
            var _a;
            const _b = this.models, models = __rest(_b, ["guideLine"]);
            return (_a = (type ? models[type] : Object.values(models))) === null || _a === void 0 ? void 0 : _a.flatMap((val) => val);
        }
        hasGuideLine() {
            const [rectModel] = this.getSeriesModels().filter(({ type }) => type === 'rect');
            return !isUndefined(this.modelForGuideLine) && isUndefined(rectModel);
        }
        getModelForGuideLine(name) {
            return this.getSeriesModels().filter(({ type }) => type === guideLineType[name])[0];
        }
        renderGroupedModels(name) {
            if (includes(Object.keys(guideLineType), name)) {
                if (this.isShow && this.hasGuideLine()) {
                    this.models.guideLine = [this.renderGuideLineModel(this.modelForGuideLine)];
                }
                else {
                    this.models.guideLine = [];
                }
            }
        }
        renderGuideLineModel(model) {
            const x = crispPixel(model.type === 'boxPlot' && model.boxPlotDetection
                ? model.boxPlotDetection.x + model.boxPlotDetection.width / 2
                : model.x);
            return {
                type: 'line',
                x,
                y: 0,
                x2: x,
                y2: this.rect.height,
                strokeStyle: '#ddd',
                lineWidth: 1,
            };
        }
        initialize() {
            this.type = 'hoveredSeries';
            this.name = 'hoveredSeries';
            this.eventBus.on('renderHoveredSeries', this.renderHoveredSeries);
            this.eventBus.on('resetHoveredSeries', this.resetHoveredSeries);
        }
        render({ layout }) {
            this.rect = layout.plot;
        }
    }

    const DRAG_MIN_WIDTH = 15;
    class Zoom extends Component {
        constructor() {
            super(...arguments);
            this.models = { selectionArea: [] };
            this.dragStartPosition = null;
            this.dragStartPoint = null;
            this.isDragging = false;
        }
        initialize() {
            this.type = 'zoom';
        }
        render(state, computed) {
            var _a, _b;
            if (!state.zoomRange) {
                return;
            }
            this.resetSelectionArea();
            const { viewRange } = computed;
            const { layout, axes, series, scale } = state;
            const categories = state.categories;
            this.rect = layout.plot;
            this.startIndex = (_b = (_a = viewRange) === null || _a === void 0 ? void 0 : _a[0], (_b !== null && _b !== void 0 ? _b : 0));
            const coordinateChart = isCoordinateSeries(series);
            if (coordinateChart) {
                const responderInfo = this.getRectResponderInfoForCoordinateType(series, scale, axes.xAxis, categories);
                this.responders = this.makeRectResponderModelForCoordinateType(responderInfo, categories);
            }
            else {
                this.responders = this.makeRectResponderModel(categories, axes.xAxis);
            }
        }
        getRectResponderInfoForCoordinateType(series, scale, axisData, categories) {
            const points = [];
            const duplicateCheckMap = {};
            Object.keys(series).forEach((seriesName) => {
                const data = series[seriesName].data;
                data.forEach(({ rawData }) => {
                    rawData.forEach((datum, idx) => {
                        if (isNull(datum)) {
                            return;
                        }
                        const dataIndex = getCoordinateDataIndex(datum, categories, idx, this.startIndex);
                        const x = getXPosition(axisData, this.rect.width, getCoordinateXValue(datum), dataIndex);
                        const xWithinRect = x >= 0 && x <= this.rect.width;
                        if (!duplicateCheckMap[x] && xWithinRect) {
                            duplicateCheckMap[x] = true;
                            points.push({ x, label: categories[dataIndex] });
                        }
                    });
                });
            });
            return points;
        }
        resetSelectionArea() {
            this.dragStartPosition = null;
            this.dragStartPoint = null;
            this.models.selectionArea = [];
            this.isDragging = false;
        }
        onMousedown({ responders, mousePosition }) {
            if (responders.length) {
                this.dragStartPoint = responders.find((responder) => responder.data.name === 'selectionArea');
                this.dragStartPosition = mousePosition;
            }
        }
        onMouseup({ responders }) {
            if (this.isDragging && this.dragStartPoint && responders.length) {
                const dragRange = [this.dragStartPoint, responders[0]]
                    .sort((a, b) => a.index - b.index)
                    .map((m) => { var _a; return (_a = m.data) === null || _a === void 0 ? void 0 : _a.value; });
                this.store.dispatch('zoom', dragRange);
                this.eventBus.emit('zoom', makeObservableObjectToNormal(dragRange));
                this.eventBus.emit('resetHoveredSeries');
                this.eventBus.emit('hideTooltip');
                // @TODO: Should occur after the series' click event
                // Additional logic to control the sequence of events with each other is required.
                setTimeout(() => {
                    this.eventBus.emit('resetSelectedSeries');
                });
            }
            this.resetSelectionArea();
        }
        makeRectResponderModel(categories, axisData) {
            const categorySize = categories.length;
            const { pointOnColumn, tickDistance } = axisData;
            const { height } = this.rect;
            const halfDetectAreaIndex = pointOnColumn ? [] : [0, categorySize - 1];
            const halfWidth = tickDistance / 2;
            return range(0, categorySize).map((index) => {
                const half = halfDetectAreaIndex.includes(index);
                const width = half ? halfWidth : tickDistance;
                let startX = 0;
                if (index !== 0) {
                    startX += pointOnColumn ? tickDistance * index : halfWidth + tickDistance * (index - 1);
                }
                return {
                    type: 'rect',
                    x: startX,
                    y: 0,
                    height,
                    width,
                    index,
                    data: { name: 'selectionArea', value: categories[index] },
                };
            });
        }
        makeRectResponderModelForCoordinateType(responderInfo, categories) {
            const responders = makeRectResponderModelForCoordinateType(responderInfo, this.rect);
            return responders.map((m, idx) => (Object.assign(Object.assign({}, m), { data: { name: 'selectionArea', value: categories[idx] } })));
        }
        onMousemove({ responders, mousePosition }) {
            if (!responders.length) {
                return;
            }
            if (this.dragStartPosition && !this.isDragging) {
                const { x } = mousePosition;
                const { x: startX } = this.dragStartPosition;
                this.isDragging = Math.abs(startX - x) > DRAG_MIN_WIDTH;
            }
            if (this.isDragging) {
                const startIndex = this.dragStartPoint.index;
                const endIndex = responders[0].index;
                const [start, end] = [startIndex, endIndex].sort(sortNumber);
                const includedResponders = this.responders.slice(start, end + 1);
                this.models.selectionArea = [
                    ...includedResponders.map((m) => (Object.assign(Object.assign({}, m), { x: m.x, y: 0, type: 'rect', color: 'rgba(0, 0, 0, 0.2)' }))),
                ];
                this.eventBus.emit('needDraw');
            }
        }
        onMouseoutComponent() {
            this.resetSelectionArea();
        }
    }

    class ResetButton extends Component {
        initialize() {
            this.type = 'resetButton';
            this.name = 'resetButton';
        }
        onClick({ responders }) {
            if (responders.length) {
                this.eventBus.emit('resetZoom');
                this.store.dispatch('resetZoom');
            }
        }
        render({ options, layout }, computed) {
            if (!isUsingResetButton(options)) {
                return;
            }
            this.rect = layout.resetButton;
            this.isShow = computed.isLineTypeSeriesZooming;
            this.models = this.isShow ? [{ type: 'resetButton', x: 0, y: 0 }] : [];
            this.responders = this.isShow
                ? [{ type: 'rect', x: 0, y: 0, width: BUTTON_RECT_SIZE, height: BUTTON_RECT_SIZE }]
                : [];
        }
    }

    class SelectedSeries extends Component {
        constructor() {
            super(...arguments);
            this.models = {};
            this.seriesModels = {};
            this.activeSeriesNames = {};
            this.isShow = false;
            this.renderSelectedSeries = (selectedSeriesEventModel) => {
                const { name, alias } = selectedSeriesEventModel;
                const models = this.getSelectedSeriesModelsForRendering(selectedSeriesEventModel);
                this.models[alias || name] = isSameSeriesResponder(Object.assign(Object.assign({}, selectedSeriesEventModel), { models, comparisonModel: this.models[alias || name] }))
                    ? []
                    : models;
                this.seriesModels[alias || name] = this.getSelectedSeriesModels(selectedSeriesEventModel);
                this.isShow = !!Object.values(this.models).flatMap((value) => value).length;
                this.eventBus.emit(this.isShow ? 'selectSeries' : 'unselectSeries', makeObservableObjectToNormal(this.seriesModels));
                this.activeSeriesNames[name] = this.getSeriesNames(selectedSeriesEventModel.models, name);
                this.setActiveState();
            };
            this.resetSelectedSeries = () => {
                this.models = {};
                this.store.dispatch('setAllLegendActiveState', true);
            };
        }
        getSeriesNames(selectedSeries, name) {
            const names = [];
            if (includes(['line', 'area', 'radar', 'bubble', 'scatter', 'bullet', 'boxPlot'], name)) {
                selectedSeries.forEach((model) => {
                    const label = model
                        .name;
                    if (label) {
                        names.push(label);
                    }
                });
            }
            else if (includes(['bar', 'column', 'radialBar'], name)) {
                selectedSeries.forEach((model) => {
                    var _a;
                    const label = (_a = model.data) === null || _a === void 0 ? void 0 : _a.label;
                    if (label) {
                        names.push(label);
                    }
                });
            }
            else if (name === 'pie') {
                Object.keys(this.models)
                    .flatMap((key) => this.models[key])
                    .forEach((model) => {
                    var _a, _b;
                    const label = ((_a = model.data) === null || _a === void 0 ? void 0 : _a.rootParentName) || ((_b = model.data) === null || _b === void 0 ? void 0 : _b.label);
                    if (label) {
                        names.push(label);
                    }
                });
            }
            return names;
        }
        getSelectedSeriesModelsForRendering(selectedSeriesEventModel) {
            const { models, eventDetectType, name } = selectedSeriesEventModel;
            let renderingModels = models;
            if ((name === 'column' || name === 'bar' || name === 'bullet') &&
                eventDetectType === 'grouped') {
                renderingModels = models.filter((model) => !model.data);
            }
            else if (name === 'radialBar' && eventDetectType === 'grouped') {
                renderingModels = models.filter((model) => !model.data);
            }
            return renderingModels;
        }
        getSelectedSeriesModels(selectedSeriesEventModel) {
            const { models, eventDetectType, name } = selectedSeriesEventModel;
            let selectedSeriesModels = models;
            if ((name === 'column' || name === 'bar' || name === 'bullet') &&
                eventDetectType === 'grouped') {
                selectedSeriesModels = models.filter((model) => model.data);
            }
            else if (name === 'radialBar' && eventDetectType === 'grouped') {
                selectedSeriesModels = models.filter((model) => model.data);
            }
            return selectedSeriesModels;
        }
        setActiveState() {
            if (this.isShow) {
                this.store.dispatch('setAllLegendActiveState', false);
                Object.values(this.activeSeriesNames).forEach((names) => {
                    names.forEach((name) => {
                        this.store.dispatch('setLegendActiveState', { name, active: true });
                    });
                });
            }
            else {
                this.store.dispatch('setAllLegendActiveState', true);
            }
            this.eventBus.emit('needDraw');
        }
        initialize() {
            this.type = 'selectedSeries';
            this.name = 'selectedSeries';
            this.eventBus.on('renderSelectedSeries', this.renderSelectedSeries);
            this.eventBus.on('resetSelectedSeries', this.resetSelectedSeries);
        }
        render({ layout }) {
            this.rect = layout.plot;
        }
    }

    class Background extends Component {
        initialize() {
            this.type = 'background';
            this.name = 'background';
        }
        render({ layout, theme }) {
            const { width, height } = layout.chart;
            this.theme = theme.chart;
            this.rect = { x: 0, y: 0, width, height };
            this.models = [
                Object.assign(Object.assign({ type: 'rect' }, this.rect), { color: this.theme.backgroundColor }),
            ];
        }
    }

    const DEFAULT_NO_DATA_TEXT = 'No data to display';
    class NoDataText extends Component {
        initialize() {
            this.type = 'noDataText';
            this.name = 'noDataText';
        }
        getCenterPosition(text, font) {
            const textWidth = getTextWidth(text, font);
            const textHeight = getTextHeight(text, font);
            return {
                x: (this.rect.width - textWidth) / 2,
                y: (this.rect.height - textHeight) / 2,
            };
        }
        render({ layout, series, options, theme }) {
            var _a, _b, _c;
            const text = (_c = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.lang) === null || _b === void 0 ? void 0 : _b.noData, (_c !== null && _c !== void 0 ? _c : DEFAULT_NO_DATA_TEXT));
            const labelTheme = theme.noData;
            const font = getTitleFontString(labelTheme);
            const fillStyle = labelTheme.color;
            this.isShow = isNoData(series);
            this.rect = layout.plot;
            this.models = [
                Object.assign(Object.assign({ type: 'label' }, this.getCenterPosition(text, font)), { text, style: [{ font, fillStyle }] }),
            ];
        }
    }

    function linePoints(ctx, pointsModel) {
        const { color: strokeStyle, lineWidth, points, dashSegments = [] } = pointsModel;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (dashSegments) {
            setLineDash(ctx, dashSegments);
        }
        let start = false;
        points.forEach((point, idx) => {
            var _a, _b;
            if (isNull(point)) {
                start = false;
                return;
            }
            if (!start) {
                ctx.moveTo(point.x, point.y);
                start = true;
                return;
            }
            if (point.controlPoint && ((_b = (_a = points[idx - 1]) === null || _a === void 0 ? void 0 : _a.controlPoint) === null || _b === void 0 ? void 0 : _b.next)) {
                const { x: prevX, y: prevY } = points[idx - 1].controlPoint.next;
                const { controlPoint, x, y } = point;
                ctx.bezierCurveTo(prevX, prevY, controlPoint.prev.x, controlPoint.prev.y, x, y);
            }
            else {
                ctx.lineTo(point.x, point.y);
            }
        });
        strokeWithOptions(ctx, { lineWidth, strokeStyle });
        ctx.closePath();
        setLineDash(ctx, []);
    }
    function areaPoints(ctx, areaPointsModel) {
        const { fillColor } = areaPointsModel;
        ctx.beginPath();
        linePoints(ctx, areaPointsModel);
        fillStyle(ctx, fillColor);
        ctx.closePath();
    }

    var lineSeriesBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        linePoints: linePoints,
        areaPoints: areaPoints
    });

    function drawXIcon(ctx, icon, rectSize) {
        const { x: startX, y: startY, theme: { color: strokeStyle, lineWidth }, } = icon;
        const offset = rectSize / 3;
        const x = startX + offset;
        const y = startY + offset;
        const x2 = startX + offset * 2;
        const y2 = startY + offset * 2;
        const points = [
            { x, y, x2, y2 },
            { x, y: y2, x2, y2: y },
        ];
        points.forEach((p) => {
            line(ctx, Object.assign(Object.assign({ type: 'line' }, p), { strokeStyle, lineWidth }));
        });
    }
    function drawMoreIcon(ctx, icon, rectSize) {
        const { x, y, theme: { color, width, height, gap }, } = icon;
        const paddingX = (rectSize - width) / 2;
        const paddingY = (rectSize - (height * 3 + gap * 2)) / 2;
        const centerX = x + paddingX;
        const points = [
            { x: centerX, y: y + paddingY },
            { x: centerX, y: y + paddingY + height + gap },
            { x: centerX, y: y + paddingY + (height + gap) * 2 },
        ];
        points.forEach((p) => {
            rect(ctx, Object.assign(Object.assign({ type: 'rect' }, p), { color, width: width, height: height }));
        });
    }
    function exportMenuButton(ctx, exportMenuButtonModel) {
        const { opened, x: xPos, y: yPos, theme } = exportMenuButtonModel;
        const { borderColor, backgroundColor, borderWidth, borderRadius, xIcon, dotIcon, } = theme;
        const x = xPos + borderWidth;
        const y = yPos + borderWidth;
        const rectSize = BUTTON_RECT_SIZE - 2 * borderWidth;
        pathRect(ctx, {
            type: 'pathRect',
            x,
            y,
            fill: backgroundColor,
            stroke: borderColor,
            width: rectSize,
            height: rectSize,
            radius: borderRadius,
            lineWidth: borderWidth,
        });
        if (opened) {
            drawXIcon(ctx, { x, y, theme: xIcon }, rectSize);
        }
        else {
            drawMoreIcon(ctx, { x, y, theme: dotIcon }, rectSize);
        }
    }

    var exportMenuBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        exportMenuButton: exportMenuButton
    });

    const ARROW_HEIGHT = 3;
    const ARROW_WIDTH = 6;
    function drawResetIcon(ctx, point) {
        const { x, y } = point;
        const centerX = x + BUTTON_RECT_SIZE / 2;
        const centerY = y + BUTTON_RECT_SIZE / 2;
        const tickSize = BUTTON_RECT_SIZE / 10;
        const color = '#545454';
        circle(ctx, {
            type: 'circle',
            x: centerX,
            y: centerY,
            radius: tickSize * 2,
            angle: { start: 0, end: Math.PI / 2 },
            color: 'transparent',
            style: [{ lineWidth: 2, strokeStyle: color }],
        });
        const pointStartX = centerX + tickSize * 2;
        const pointStartY = centerY;
        const points = [
            { x: pointStartX - ARROW_WIDTH / 2, y: pointStartY },
            { x: pointStartX + ARROW_WIDTH / 2, y: pointStartY },
            { x: pointStartX, y: pointStartY + ARROW_HEIGHT },
        ];
        areaPoints(ctx, {
            type: 'areaPoints',
            points,
            lineWidth: 1,
            color,
            fillColor: color,
        });
    }
    function drawBackIcon(ctx, point) {
        const barWidth = 4;
        const radius = BUTTON_RECT_SIZE / 7;
        const { x, y } = point;
        const centerX = x + BUTTON_RECT_SIZE / 2;
        const centerY = y + BUTTON_RECT_SIZE / 2;
        const color = '#545454';
        line(ctx, {
            type: 'line',
            lineWidth: 2,
            x: centerX - barWidth / 2,
            y: centerY + radius,
            x2: centerX + barWidth / 2,
            y2: centerY + radius,
            strokeStyle: color,
        });
        line(ctx, {
            type: 'line',
            lineWidth: 2,
            x: centerX - barWidth / 2,
            y: centerY - radius,
            x2: centerX + barWidth / 2,
            y2: centerY - radius,
            strokeStyle: color,
        });
        circle(ctx, {
            type: 'circle',
            x: centerX + barWidth / 2,
            y: centerY,
            radius,
            angle: { start: Math.PI / 2, end: (Math.PI * 3) / 2 },
            color: 'transparent',
            style: [{ lineWidth: 2, strokeStyle: color }],
        });
        const pointStartX = centerX - barWidth / 2;
        const pointStartY = centerY - radius;
        const points = [
            { x: pointStartX - ARROW_HEIGHT, y: pointStartY },
            { x: pointStartX, y: pointStartY - ARROW_WIDTH / 2 },
            { x: pointStartX, y: pointStartY + ARROW_WIDTH / 2 },
        ];
        areaPoints(ctx, {
            type: 'areaPoints',
            points,
            lineWidth: 1,
            color,
            fillColor: color,
        });
    }
    function backButton(ctx, backButtonModel) {
        const { x, y } = backButtonModel;
        pathRect(ctx, {
            type: 'pathRect',
            x,
            y,
            fill: '#f4f4f4',
            stroke: '#f4f4f4',
            width: BUTTON_RECT_SIZE,
            height: BUTTON_RECT_SIZE,
            radius: 5,
        });
        drawBackIcon(ctx, { x, y });
    }
    function resetButton(ctx, resetButtonModel) {
        const { x, y } = resetButtonModel;
        pathRect(ctx, {
            type: 'pathRect',
            x,
            y,
            fill: '#f4f4f4',
            stroke: '#f4f4f4',
            width: BUTTON_RECT_SIZE,
            height: BUTTON_RECT_SIZE,
            radius: 5,
        });
        drawResetIcon(ctx, { x, y });
    }

    var resetButtonBrush = /*#__PURE__*/Object.freeze({
        __proto__: null,
        backButton: backButton,
        resetButton: resetButton
    });

    /**
     * @class
     * @classdesc Line Chart
     * @param {Object} props
     *   @param {HTMLElement} props.el - The target element to create chart.
     *   @param {Object} props.data - Data for making Line Chart.
     *     @param {Array<string>} [props.data.categories] - Categories.
     *     @param {Array<Object>} props.data.series - Series data.
     *       @param {string} props.data.series.name - Series name.
     *       @param {Array<number|Object|Array>} props.data.series.data - Series data.
     *   @param {Object} [props.options] - Options for making Line Chart.
     *     @param {Object} [props.options.chart]
     *       @param {string|Object} [props.options.chart.title] - Chart title text or options.
     *         @param {string} [props.options.chart.title.text] - Chart title text.
     *         @param {number} [props.options.chart.title.offsetX] - Offset value to move title horizontally.
     *         @param {number} [props.options.chart.title.offsetY] - Offset value to move title vertically.
     *         @param {string} [props.options.chart.title.align] - Chart text align. 'left', 'right', 'center' is available.
     *       @param {boolean|Object} [props.options.chart.animation] - Whether to use animation and duration when rendering the initial chart.
     *       @param {number|string} [props.options.chart.width] - Chart width. 'auto' or if not write, the width of the parent container is followed. 'auto' or if not created, the width of the parent container is followed.
     *       @param {number|string} [props.options.chart.height] - Chart height. 'auto' or if not write, the width of the parent container is followed. 'auto' or if not created, the height of the parent container is followed.
     *     @param {Object} [props.options.series]
     *       @param {boolean} [props.options.series.selectable=false] - Whether to make selectable series or not.
     *       @param {boolean} [props.options.series.showDot=false] - Whether to show dot or not.
     *       @param {boolean} [props.options.series.spline=false] - Whether to make spline chart or not.
     *       @param {boolean} [props.options.series.zoomable=false] - Whether to use zoom feature or not.
     *       @param {string} [props.options.series.eventDetectType] - Event detect type. 'near', 'nearest', 'grouped', 'point' is available.
     *       @param {boolean} [props.options.series.shift=false] - Whether to use shift when addData or not.
     *       @param {Object} [props.options.series.dataLabels] - Set the visibility, location, and formatting of dataLabel. For specific information, refer to the {@link https://github.com/nhn/tui.chart|DataLabels guide} on github.
     *     @param {Object} [props.options.xAxis]
     *       @param {string|Object} [props.options.xAxis.title] - Axis title.
     *       @param {boolean} [props.options.xAxis.pointOnColumn=false] - Whether to move the start of the chart to the center of the column.
     *       @param {boolean} [props.options.xAxis.rotateLabel=true] - Whether to allow axis label rotation.
     *       @param {boolean|Object} [props.options.xAxis.date] - Whether the x axis label is of date type. Format option used for date type. Whether the x axis label is of date type. If use date type, format option used for date type.
     *       @param {Object} [props.options.xAxis.tick] - Option to adjust tick interval.
     *       @param {Object} [props.options.xAxis.label] - Option to adjust label interval.
     *       @param {Object} [props.options.xAxis.scale] - Option to adjust axis minimum, maximum, step size.
     *       @param {number} [props.options.xAxis.width] - Width of xAxis.
     *       @param {number} [props.options.xAxis.height] - Height of xAxis.
     *     @param {Object|Array<Object>} [props.options.yAxis] - If this option is an array type, use the secondary y axis.
     *       @param {string|Object} [props.options.yAxis.title] - Axis title.
     *       @param {Object} [props.options.yAxis.tick] - Option to adjust tick interval.
     *       @param {Object} [props.options.yAxis.label] - Option to adjust label interval.
     *       @param {Object} [props.options.yAxis.scale] - Option to adjust axis minimum, maximum, step size.
     *       @param {number} [props.options.yAxis.width] - Width of yAxis.
     *       @param {number} [props.options.yAxis.height] - Height of yAxis.
     *     @param {Object} [props.options.plot]
     *       @param {number} [props.options.plot.width] - Width of plot.
     *       @param {number} [props.options.plot.height] - Height of plot.
     *       @param {boolean} [props.options.plot.visible] - Whether to show plot line.
     *       @param {Array<Object>} [props.options.plot.lines] - Plot lines information. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Plot guide} on github.
     *       @param {Array<Object>} [props.options.plot.bands] - Plot bands information. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Plot guide} on github.
     *     @param {Object} [props.options.legend]
     *       @param {string} [props.options.legend.align] - Legend align. 'top', 'bottom', 'right', 'left' is available.
     *       @param {string} [props.options.legend.showCheckbox] - Whether to show checkbox.
     *       @param {boolean} [props.options.legend.visible] - Whether to show legend.
     *       @param {number} [props.options.legend.width] - Width of legend.
     *       @param {Object} [props.options.legend.item] - `width` and `overflow` options of the legend item. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Legend guide} on github.
     *     @param {Object} [props.options.exportMenu]
     *       @param {boolean} [props.options.exportMenu.visible] - Whether to show export menu.
     *       @param {string} [props.options.exportMenu.filename] - File name applied when downloading.
     *     @param {Object} [props.options.tooltip]
     *       @param {number} [props.options.tooltip.offsetX] - Offset value to move title horizontally.
     *       @param {number} [props.options.tooltip.offsetY] - Offset value to move title vertically.
     *       @param {Function} [props.options.tooltip.formatter] - Function to format data value.
     *       @param {Function} [props.options.tooltip.template] - Function to create custom template. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Tooltip guide} on github.
     *     @param {Object} [props.options.responsive] - Rules for changing chart options. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Responsive guide} on github.
     *       @param {boolean|Object} [props.options.responsive.animation] - Animation duration when the chart is modified.
     *       @param {Array<Object>} [props.options.responsive.rules] - Rules for the Chart to Respond.
     *     @param {Object} [props.options.lang] - Options for changing the text displayed on the chart or i18n languages.
     *       @param {Object} [props.options.lang.noData] - No Data Layer Text.
     *     @param {Object} [props.options.theme] - Chart theme options. For specific information, refer to the {@link https://github.com/nhn/tui.chart|Line Chart guide} on github.
     *       @param {Object} [props.options.theme.chart] - Chart font theme.
     *       @param {Object} [props.options.theme.noData] - No Data Layer Text theme.
     *       @param {Object} [props.options.theme.series] - Series theme.
     *       @param {Object} [props.options.theme.title] - Title theme.
     *       @param {Object} [props.options.theme.xAxis] - X Axis theme.
     *       @param {Object|Array<Object>} [props.options.theme.yAxis] - Y Axis theme. In the case of an arrangement, the first is the main axis and the second is the theme for the secondary axis.
     *       @param {Object} [props.options.theme.legend] - Legend theme.
     *       @param {Object} [props.options.theme.tooltip] - Tooltip theme.
     *       @param {Object} [props.options.theme.plot] - Plot theme.
     *       @param {Object} [props.options.theme.exportMenu] - ExportMenu theme.
     * @extends Chart
     */
    class LineChart extends Chart$1 {
        constructor(props) {
            var _a;
            super({
                el: props.el,
                options: props.options,
                series: {
                    line: props.data.series,
                },
                categories: (_a = props.data) === null || _a === void 0 ? void 0 : _a.categories,
                modules: [dataRange$1, scale$1, axes$1, plot$1],
            });
        }
        initialize() {
            super.initialize();
            this.componentManager.add(Background);
            this.componentManager.add(Title);
            this.componentManager.add(Plot);
            this.componentManager.add(Legend);
            this.componentManager.add(LineSeries);
            this.componentManager.add(Axis, { name: 'yAxis' });
            this.componentManager.add(Axis, { name: 'xAxis' });
            this.componentManager.add(Axis, { name: 'secondaryYAxis' });
            this.componentManager.add(DataLabels);
            this.componentManager.add(AxisTitle, { name: 'xAxis' });
            this.componentManager.add(AxisTitle, { name: 'yAxis' });
            this.componentManager.add(AxisTitle, { name: 'secondaryYAxis' });
            this.componentManager.add(ExportMenu, { chartEl: this.el });
            this.componentManager.add(HoveredSeries);
            this.componentManager.add(SelectedSeries);
            this.componentManager.add(Tooltip, { chartEl: this.el });
            this.componentManager.add(Zoom);
            this.componentManager.add(ResetButton);
            this.componentManager.add(NoDataText);
            this.painter.addGroups([
                basicBrush,
                axisBrush,
                lineSeriesBrush,
                legendBrush,
                labelBrush,
                exportMenuBrush,
                dataLabelBrush,
                resetButtonBrush,
            ]);
        }
        /**
         * Add data.
         * @param {Array<number|Object|Array>} data - Array of data to be added.
         * @param {string} category - Category to be added.
         * @api
         * @example
         * chart.addData([10, 20], '6');
         */
        addData(data, category) {
            var _a;
            if ((_a = this.store.state.options.series) === null || _a === void 0 ? void 0 : _a.showDot) {
                this.animationControlFlag.updating = true;
            }
            this.resetSeries();
            this.store.dispatch('addData', { data, category });
        }
        /**
         * Add series.
         * @param {Object} data - Data to be added.
         *   @param {string} data.name - Series name.
         *   @param {Array<number|Object|Array>} data.data - Array of data to be added.
         * @api
         * @example
         * chart.addSeries({
         *   name: 'newSeries',
         *   data: [10, 100, 50, 40, 70, 55, 33, 70, 90, 110],
         * });
         */
        addSeries(data) {
            this.resetSeries();
            this.store.dispatch('addSeries', { data });
        }
        /**
         * Convert the chart data to new data.
         * @param {Object} data - Data to be set.
         * @api
         * @example
         * chart.setData({
         *   categories: ['1', '2', '3'],
         *   series: [
         *     {
         *       name: 'new series',
         *       data: [1, 2, 3],
         *     },
         *     {
         *       name: 'new series2',
         *       data: [4, 5, 6],
         *     }
         *   ]
         * });
         */
        setData(data) {
            const { categories, series } = data;
            this.resetSeries();
            this.store.dispatch('setData', { series: { line: series }, categories });
        }
        /**
         * Add plot line.
         * @param {Object} data - Plot info.
         *    @param {string|number} data.value - The value where the plot line will be drawn.
         *    @param {string} data.color - Plot line color.
         *    @param {string} [data.id] - Plot id. The value on which the removePlotLine is based.
         * @api
         * @example
         * chart.addPlotLine({
         *   value: 2,
         *   color: '#00ff22',
         *   id: 'plot-1',
         * });
         */
        addPlotLine(data) {
            this.store.dispatch('addPlotLine', { data });
        }
        /**
         * Remove plot line with id.
         * @param {string} id - Id of the plot line to be removed.
         * @api
         * @example
         * chart.removePlotLine('plot-1');
         */
        removePlotLine(id) {
            this.store.dispatch('removePlotLine', { id });
        }
        /**
         * Add plot band.
         * @param {Object} data - Plot info.
         *   @param {Array<string|number>} data.range - The range to be drawn.
         *   @param {string} data.color - Plot band color.
         *   @param {string} [data.id] - Plot id. The value on which the removePlotBand is based.
         * @api
         * @example
         * chart.addPlotBand({
         *   value: [2, 4],
         *   color: '#00ff22',
         *   id: 'plot-1',
         * });
         */
        addPlotBand(data) {
            this.store.dispatch('addPlotBand', { data });
        }
        /**
         * Remove plot band with id.
         * @param {string} id - id of the plot band to be removed
         * @api
         * @example
         * chart.removePlotBand('plot-1');
         */
        removePlotBand(id) {
            this.store.dispatch('removePlotBand', { id });
        }
        /**
         * Hide series data label.
         * @api
         * @example
         * chart.hideSeriesDataLabel();
         */
        hideSeriesDataLabel() {
            this.store.dispatch('updateOptions', {
                options: { series: { dataLabels: { visible: false } } },
            });
        }
        /**
         * Show series data label.
         * @api
         * @example
         * chart.showSeriesDataLabel();
         */
        showSeriesDataLabel() {
            this.store.dispatch('updateOptions', {
                options: { series: { dataLabels: { visible: true } } },
            });
        }
        /**
         * Convert the chart options to new options.
         * @param {Object} options - Chart options.
         * @api
         * @example
         * chart.setOptions({
         *   chart: {
         *     width: 500,
         *     height: 'auto',
         *     title: 'Energy Usage',
         *   },
         *   xAxis: {
         *     title: 'Month',
         *     date: { format: 'yy/MM' },
         *   },
         *   yAxis: {
         *     title: 'Energy (kWh)',
         *   },
         *   series: {
         *     selectable: true,
         *   },
         *   tooltip: {
         *     formatter: (value) => `${value}kWh`,
         *   },
         * });
         */
        setOptions(options) {
            this.resetSeries();
            this.dispatchOptionsEvent('initOptions', options);
        }
        /**
         * Update chart options.
         * @param {Object} options - Chart options.
         * @api
         * @example
         * chart.updateOptions({
         *   chart: {
         *     height: 'auto',
         *     title: 'Energy Usage',
         *   },
         *   tooltip: {
         *     formatter: (value) => `${value}kWh`,
         *   },
         * });
         */
        updateOptions(options) {
            this.resetSeries();
            this.dispatchOptionsEvent('updateOptions', options);
        }
        /**
         * Show tooltip.
         * @param {Object} seriesInfo - Information of the series for the tooltip to be displayed.
         *      @param {number} seriesInfo.index - Index of data within series. If 'series.eventDetectType' is "grouped", only seriesIndex is needed.
         *      @param {number} [seriesInfo.seriesIndex] - Index of series.
         * @api
         * @example
         * chart.showTooltip({index: 1, seriesIndex: 2});
         */
        showTooltip(seriesInfo) {
            this.eventBus.emit('showTooltip', Object.assign({}, seriesInfo));
        }
        /**
         * Hide tooltip.
         * @api
         * @example
         * chart.hideTooltip();
         */
        hideTooltip() {
            this.eventBus.emit('hideTooltip');
        }
    }

    /* src\Chart.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file$1 = "src\\Chart.svelte";

    function create_fragment$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "chartCanvas");
    			add_location(div, file$1, 84, 0, 2489);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Chart', slots, []);
    	let category = problems.map(problem => problem.date).reverse();
    	console.log(category);
    	let series = [];

    	for (let user of users) {
    		let username = user.name;
    		let data = [];
    		let categoryPoint = 0;
    		let solvedPoint = 0;
    		let point = 0;

    		for (; categoryPoint < category.length; categoryPoint++) {
    			while (solvedPoint < user.solveds.length && category[categoryPoint] == user.solveds[solvedPoint].split(":")[0]) {
    				switch (user.solveds[solvedPoint].split(":")[1]) {
    					case "easy":
    						point = point + 10;
    						break;
    					case "medium":
    						point = point + 20;
    						break;
    					case "hard":
    						point = point + 30;
    						break;
    				}

    				solvedPoint++;
    			}

    			data.push(point);
    		}

    		series.push({ name: username, data });
    	}

    	onMount(() => {
    		new LineChart({
    				el: document.querySelector("#chartCanvas"),
    				data: { categories: category, series },
    				options: {
    					chart: { width: 684, height: 456 }, //   height: 300,
    					// title: "똑냥이 랭킹",
    					xAxis: {
    						title: "날짜",
    						date: { format: "yy/MM/dd" }
    					},
    					yAxis: { title: "점수(score)" },
    					series: { selectable: true },
    					legend: { align: "bottom" },
    					tooltip: {
    						// css 문제로 tooltip 제거 전역 CSS 재작성 해야함.
    						template: () => {
    							return `<div style="width: 0px;></div>`;
    						}
    					}
    				}
    			});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Chart> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		LineChart,
    		users,
    		problems,
    		category,
    		series
    	});

    	$$self.$inject_state = $$props => {
    		if ('category' in $$props) category = $$props.category;
    		if ('series' in $$props) series = $$props.series;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Chart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Chart",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (37:1) {#if tap == 0}
    function create_if_block_9(ctx) {
    	let h3;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let p2;
    	let t7;
    	let p3;
    	let t9;
    	let p4;
    	let t11;
    	let p5;
    	let t13;
    	let p6;
    	let t15;
    	let p7;
    	let t16;
    	let a;
    	let t18;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "2022 코딩 테스트 성실 냥이 콘테스트";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "1. 일주일에 3~5일 정도 가량 냥냥이가 엄선한 문제가 올라오는 거시애옹";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "2. 청정수 문제 1개, 썩은물 문제 1개씩 내는 거시애옹";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "3. 문제를 풀 때마다 성실 냥이 점수가 1점씩 올르는 거시애옹";
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "4. 몇일 지난 문제도 풀어도 점수가 인정되는 거시애옹";
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "5. 문제 목록은 이 사이트에서 확인 할 수 있는 거시야옹!";
    			t11 = space();
    			p5 = element("p");
    			p5.textContent = "6. 각종 개선사항 및 문의는 눈냥이한테 물어봐달라냥";
    			t13 = space();
    			p6 = element("p");
    			p6.textContent = "7. 요청은 냥냥이 || 날코냥이 || 눈냥이 한테 문의하면 된다냥!";
    			t15 = space();
    			p7 = element("p");
    			t16 = text("9. 점수 반영 요청은 ");
    			a = element("a");
    			a.textContent = "이 링크";
    			t18 = text("륵 클릭하여 문제를 푼 스크린샷을 첨부하면 하면 냥냥이와 눈냥이가 일괄 처리 한다냥!");
    			add_location(h3, file, 37, 2, 759);
    			add_location(p0, file, 38, 2, 794);
    			add_location(p1, file, 39, 2, 846);
    			add_location(p2, file, 40, 2, 889);
    			add_location(p3, file, 41, 2, 935);
    			add_location(p4, file, 42, 2, 976);
    			add_location(p5, file, 43, 2, 1020);
    			add_location(p6, file, 44, 9, 1067);
    			attr_dev(a, "href", "https://docs.google.com/forms/d/e/1FAIpQLSfWbriP5yBfhPHMNNg44hhWUxEq-vSLYTZBES_guPUx3l9K7A/viewform?usp=sf_link");
    			add_location(a, file, 45, 18, 1132);
    			add_location(p7, file, 45, 2, 1116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, t16);
    			append_dev(p7, a);
    			append_dev(p7, t18);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(p5);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(p6);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(p7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(37:1) {#if tap == 0}",
    		ctx
    	});

    	return block;
    }

    // (49:1) {#if tap == 1}
    function create_if_block_5(ctx) {
    	let chart;
    	let t;
    	let each_1_anchor;
    	let current;
    	chart = new Chart({ $$inline: true });
    	let each_value_1 = users;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			create_component(chart.$$.fragment);
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(chart, target, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*users*/ 0) {
    				each_value_1 = users;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chart.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chart.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chart, detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(49:1) {#if tap == 1}",
    		ctx
    	});

    	return block;
    }

    // (55:4) {#if user.easy > 0}
    function create_if_block_8(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[5].easy + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("easy: ");
    			t1 = text(t1_value);
    			add_location(p, file, 55, 5, 1589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(55:4) {#if user.easy > 0}",
    		ctx
    	});

    	return block;
    }

    // (58:4) {#if user.medium}
    function create_if_block_7(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[5].medium + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("medium: ");
    			t1 = text(t1_value);
    			add_location(p, file, 58, 5, 1654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(58:4) {#if user.medium}",
    		ctx
    	});

    	return block;
    }

    // (61:4) {#if user.hard > 0}
    function create_if_block_6(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[5].hard + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("hard: ");
    			t1 = text(t1_value);
    			add_location(p, file, 61, 5, 1725);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(61:4) {#if user.hard > 0}",
    		ctx
    	});

    	return block;
    }

    // (68:4) {#each user.solveds as solved}
    function create_each_block_2(ctx) {
    	let li;
    	let t_value = /*solved*/ ctx[8] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 68, 5, 1882);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(68:4) {#each user.solveds as solved}",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#each users as user, i}
    function create_each_block_1(ctx) {
    	let h3;
    	let t0_value = /*i*/ ctx[7] + 1 + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[5].name + "";
    	let t2;
    	let t3;
    	let a;
    	let t4;
    	let t5_value = /*user*/ ctx[5].contact + "";
    	let t5;
    	let t6;
    	let t7;
    	let details0;
    	let summary0;
    	let b;
    	let t8;
    	let t9_value = /*user*/ ctx[5].score + "";
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let details1;
    	let summary1;
    	let t15;
    	let ol;
    	let t16;
    	let if_block0 = /*user*/ ctx[5].easy > 0 && create_if_block_8(ctx);
    	let if_block1 = /*user*/ ctx[5].medium && create_if_block_7(ctx);
    	let if_block2 = /*user*/ ctx[5].hard > 0 && create_if_block_6(ctx);
    	let each_value_2 = /*user*/ ctx[5].solveds;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = text(" : ");
    			t2 = text(t2_value);
    			t3 = text(" (");
    			a = element("a");
    			t4 = text("@");
    			t5 = text(t5_value);
    			t6 = text(")");
    			t7 = space();
    			details0 = element("details");
    			summary0 = element("summary");
    			b = element("b");
    			t8 = text("total score: ");
    			t9 = text(t9_value);
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			if (if_block2) if_block2.c();
    			t13 = space();
    			details1 = element("details");
    			summary1 = element("summary");
    			summary1.textContent = "solved problems";
    			t15 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t16 = space();
    			attr_dev(a, "href", "https://github.com/" + /*user*/ ctx[5].contact);
    			add_location(a, file, 51, 28, 1417);
    			add_location(h3, file, 51, 3, 1392);
    			add_location(b, file, 53, 13, 1515);
    			add_location(summary0, file, 53, 4, 1506);
    			add_location(details0, file, 52, 3, 1491);
    			add_location(summary1, file, 65, 4, 1795);
    			add_location(ol, file, 66, 4, 1835);
    			add_location(details1, file, 64, 3, 1780);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			append_dev(h3, t3);
    			append_dev(h3, a);
    			append_dev(a, t4);
    			append_dev(a, t5);
    			append_dev(h3, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, details0, anchor);
    			append_dev(details0, summary0);
    			append_dev(summary0, b);
    			append_dev(b, t8);
    			append_dev(b, t9);
    			append_dev(details0, t10);
    			if (if_block0) if_block0.m(details0, null);
    			append_dev(details0, t11);
    			if (if_block1) if_block1.m(details0, null);
    			append_dev(details0, t12);
    			if (if_block2) if_block2.m(details0, null);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, details1, anchor);
    			append_dev(details1, summary1);
    			append_dev(details1, t15);
    			append_dev(details1, ol);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ol, null);
    			}

    			append_dev(details1, t16);
    		},
    		p: function update(ctx, dirty) {
    			if (/*user*/ ctx[5].easy > 0) if_block0.p(ctx, dirty);
    			if (/*user*/ ctx[5].medium) if_block1.p(ctx, dirty);
    			if (/*user*/ ctx[5].hard > 0) if_block2.p(ctx, dirty);

    			if (dirty & /*users*/ 0) {
    				each_value_2 = /*user*/ ctx[5].solveds;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(details0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(details1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(51:2) {#each users as user, i}",
    		ctx
    	});

    	return block;
    }

    // (76:1) {#if tap == 2}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let each_value = problems;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*problems*/ 0) {
    				each_value = problems;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(76:1) {#if tap == 2}",
    		ctx
    	});

    	return block;
    }

    // (81:4) {#if problem.easy != ''}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let a;
    	let t1_value = /*problem*/ ctx[2].easy + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("easy: ");
    			a = element("a");
    			t1 = text(t1_value);
    			attr_dev(a, "href", /*problem*/ ctx[2].easy);
    			add_location(a, file, 81, 14, 2124);
    			add_location(p, file, 81, 5, 2115);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(a, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(81:4) {#if problem.easy != ''}",
    		ctx
    	});

    	return block;
    }

    // (84:4) {#if problem.medium != ''}
    function create_if_block_3(ctx) {
    	let p;
    	let t0;
    	let a;
    	let t1_value = /*problem*/ ctx[2].medium + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("medium: ");
    			a = element("a");
    			t1 = text(t1_value);
    			attr_dev(a, "href", /*problem*/ ctx[2].medium);
    			add_location(a, file, 84, 16, 2230);
    			add_location(p, file, 84, 5, 2219);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(a, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(84:4) {#if problem.medium != ''}",
    		ctx
    	});

    	return block;
    }

    // (87:4) {#if problem.hard != ''}
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let a;
    	let t1_value = /*problem*/ ctx[2].hard + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("hard: ");
    			a = element("a");
    			t1 = text(t1_value);
    			attr_dev(a, "href", /*problem*/ ctx[2].hard);
    			add_location(a, file, 87, 14, 2336);
    			add_location(p, file, 87, 5, 2327);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(a, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(87:4) {#if problem.hard != ''}",
    		ctx
    	});

    	return block;
    }

    // (77:2) {#each problems as problem}
    function create_each_block(ctx) {
    	let h3;
    	let t0_value = /*problem*/ ctx[2].date + "";
    	let t0;
    	let t1;
    	let details;
    	let summary;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let if_block0 = /*problem*/ ctx[2].easy != '' && create_if_block_4(ctx);
    	let if_block1 = /*problem*/ ctx[2].medium != '' && create_if_block_3(ctx);
    	let if_block2 = /*problem*/ ctx[2].hard != '' && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			details = element("details");
    			summary = element("summary");
    			summary.textContent = "list";
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			add_location(h3, file, 77, 3, 2012);
    			add_location(summary, file, 79, 4, 2055);
    			add_location(details, file, 78, 3, 2040);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, details, anchor);
    			append_dev(details, summary);
    			append_dev(details, t3);
    			if (if_block0) if_block0.m(details, null);
    			append_dev(details, t4);
    			if (if_block1) if_block1.m(details, null);
    			append_dev(details, t5);
    			if (if_block2) if_block2.m(details, null);
    			append_dev(details, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (/*problem*/ ctx[2].easy != '') if_block0.p(ctx, dirty);
    			if (/*problem*/ ctx[2].medium != '') if_block1.p(ctx, dirty);
    			if (/*problem*/ ctx[2].hard != '') if_block2.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(details);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(77:2) {#each problems as problem}",
    		ctx
    	});

    	return block;
    }

    // (94:1) {#if tap == 3}
    function create_if_block(ctx) {
    	let p;
    	let t1;
    	let a;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "라룩냥이는 돼뚱냥이";
    			t1 = space();
    			a = element("a");
    			a.textContent = "카카오톡 오픈톡 링크";
    			add_location(p, file, 94, 2, 2449);
    			attr_dev(a, "href", "https://open.kakao.com/o/gbCkR4zd");
    			add_location(a, file, 95, 2, 2470);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(94:1) {#if tap == 3}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let button3;
    	let t9;
    	let hr;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*tap*/ ctx[0] == 0 && create_if_block_9(ctx);
    	let if_block1 = /*tap*/ ctx[0] == 1 && create_if_block_5(ctx);
    	let if_block2 = /*tap*/ ctx[0] == 2 && create_if_block_1(ctx);
    	let if_block3 = /*tap*/ ctx[0] == 3 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Algorithm Challengers";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "소개";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "똑냥이 랭킹";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "문제";
    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "냥방";
    			t9 = space();
    			hr = element("hr");
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			if (if_block2) if_block2.c();
    			t13 = space();
    			if (if_block3) if_block3.c();
    			add_location(h1, file, 29, 1, 465);
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 30, 1, 498);
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 31, 1, 555);
    			attr_dev(button2, "type", "button");
    			add_location(button2, file, 32, 1, 616);
    			attr_dev(button3, "type", "button");
    			add_location(button3, file, 33, 1, 673);
    			add_location(hr, file, 34, 1, 730);
    			add_location(main, file, 28, 0, 456);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, button0);
    			append_dev(main, t3);
    			append_dev(main, button1);
    			append_dev(main, t5);
    			append_dev(main, button2);
    			append_dev(main, t7);
    			append_dev(main, button3);
    			append_dev(main, t9);
    			append_dev(main, hr);
    			append_dev(main, t10);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t11);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t12);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t13);
    			if (if_block3) if_block3.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*setTap*/ ctx[1](0), false, false, false),
    					listen_dev(button1, "click", /*setTap*/ ctx[1](1), false, false, false),
    					listen_dev(button2, "click", /*setTap*/ ctx[1](2), false, false, false),
    					listen_dev(button3, "click", /*setTap*/ ctx[1](3), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*tap*/ ctx[0] == 0) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_9(ctx);
    					if_block0.c();
    					if_block0.m(main, t11);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*tap*/ ctx[0] == 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*tap*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, t12);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*tap*/ ctx[0] == 2) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(main, t13);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*tap*/ ctx[0] == 3) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(main, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let tap = 0;

    	function setTap(t) {
    		switch (t) {
    			case 0:
    				break;
    			case 1:
    				users.sort((a, b) => b.score - a.score);
    				break;
    		}

    		return function () {
    			$$invalidate(0, tap = t);
    		};
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ users, problems, Chart, tap, setTap });

    	$$self.$inject_state = $$props => {
    		if ('tap' in $$props) $$invalidate(0, tap = $$props.tap);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tap, setTap];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
