
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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

    const solveds = {
        '냥냥이':
            [
                '2020-04-13:easy',
                '2022-04-14:easy',
                '2022-04-15:easy',
            ],
        'snowmerak':
            [
                '2020-04-13:easy',
                '2022-04-14:easy',
                '2022-04-15:easy',
            ],
        'lemon-mint':
            [
                '2022-04-15:easy',
            ],
    };

    class User {
        constructor(name, contact) {
            this.name = name;
            this.contact = contact;
            this.easy = 0;
            this.medium = 0;
            this.hard = 0;
            this.score = 0;
        }
    }

    let users = [
        new User('냥냥이', '@arc-jung'),
        new User('snowmerak', '@snowmerak'),
        new User('lemon-mint', '@lemon-mint'),
    ];

    users.sort((a, b) => b.score - a.score);

    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        let solved = solveds[user.name];
        if (solved) {
            for (let j = 0; j < solved.length; j++) {
                let [date, level] = solved[j].split(':');
                if (level === 'easy') {
                    user.easy++;
                } else if (level === 'medium') {
                    user.medium++;
                } else if (level === 'hard') {
                    user.hard++;
                }
            }
            user.score = user.easy + user.medium + user.hard;
        }
    }

    class Problem {
        constructor(date, easy, medium, hard) {
            this.date = date;
            this.easy = easy;
            this.medium = medium;
            this.hard = hard;
        }
    }

    const problems = [
        new Problem('2020-04-13', 'https://programmers.co.kr/learn/courses/30/lessons/77884', '', ''),
        new Problem('2022-04-14', 'https://programmers.co.kr/learn/courses/30/lessons/42840', '', ''),
        new Problem('2022-04-15', 'https://programmers.co.kr/learn/courses/30/lessons/42748', '', ''),
    ];

    /* src/App.svelte generated by Svelte v3.47.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (15:3) {#if user.easy > 0}
    function create_if_block_5(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[3].easy + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("easy: ");
    			t1 = text(t1_value);
    			add_location(p, file, 15, 4, 362);
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
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(15:3) {#if user.easy > 0}",
    		ctx
    	});

    	return block;
    }

    // (18:3) {#if user.medium}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[3].medium + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("medium: ");
    			t1 = text(t1_value);
    			add_location(p, file, 18, 4, 421);
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(18:3) {#if user.medium}",
    		ctx
    	});

    	return block;
    }

    // (21:3) {#if user.hard > 0}
    function create_if_block_3(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*user*/ ctx[3].hard + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("hard: ");
    			t1 = text(t1_value);
    			add_location(p, file, 21, 4, 486);
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(21:3) {#if user.hard > 0}",
    		ctx
    	});

    	return block;
    }

    // (28:3) {#each solveds[user.name] as solved}
    function create_each_block_2(ctx) {
    	let li;
    	let t_value = /*solved*/ ctx[6] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 28, 5, 636);
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
    		source: "(28:3) {#each solveds[user.name] as solved}",
    		ctx
    	});

    	return block;
    }

    // (11:1) {#each users as user, i}
    function create_each_block_1(ctx) {
    	let h3;
    	let t0_value = /*i*/ ctx[5] + 1 + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[3].name + "";
    	let t2;
    	let t3;
    	let t4_value = /*user*/ ctx[3].contact + "";
    	let t4;
    	let t5;
    	let t6;
    	let details0;
    	let summary0;
    	let b;
    	let t7;
    	let t8_value = /*user*/ ctx[3].score + "";
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let details1;
    	let summary1;
    	let t14;
    	let ol;
    	let if_block0 = /*user*/ ctx[3].easy > 0 && create_if_block_5(ctx);
    	let if_block1 = /*user*/ ctx[3].medium && create_if_block_4(ctx);
    	let if_block2 = /*user*/ ctx[3].hard > 0 && create_if_block_3(ctx);
    	let each_value_2 = solveds[/*user*/ ctx[3].name];
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
    			t4 = text(t4_value);
    			t5 = text(")");
    			t6 = space();
    			details0 = element("details");
    			summary0 = element("summary");
    			b = element("b");
    			t7 = text("total score: ");
    			t8 = text(t8_value);
    			t9 = space();
    			if (if_block0) if_block0.c();
    			t10 = space();
    			if (if_block1) if_block1.c();
    			t11 = space();
    			if (if_block2) if_block2.c();
    			t12 = space();
    			details1 = element("details");
    			summary1 = element("summary");
    			summary1.textContent = "solved problems";
    			t14 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file, 11, 2, 222);
    			add_location(b, file, 13, 12, 292);
    			add_location(summary0, file, 13, 3, 283);
    			add_location(details0, file, 12, 2, 270);
    			add_location(summary1, file, 25, 3, 548);
    			add_location(ol, file, 26, 3, 586);
    			add_location(details1, file, 24, 2, 535);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			append_dev(h3, t3);
    			append_dev(h3, t4);
    			append_dev(h3, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, details0, anchor);
    			append_dev(details0, summary0);
    			append_dev(summary0, b);
    			append_dev(b, t7);
    			append_dev(b, t8);
    			append_dev(details0, t9);
    			if (if_block0) if_block0.m(details0, null);
    			append_dev(details0, t10);
    			if (if_block1) if_block1.m(details0, null);
    			append_dev(details0, t11);
    			if (if_block2) if_block2.m(details0, null);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, details1, anchor);
    			append_dev(details1, summary1);
    			append_dev(details1, t14);
    			append_dev(details1, ol);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ol, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*user*/ ctx[3].easy > 0) if_block0.p(ctx, dirty);
    			if (/*user*/ ctx[3].medium) if_block1.p(ctx, dirty);
    			if (/*user*/ ctx[3].hard > 0) if_block2.p(ctx, dirty);

    			if (dirty & /*solveds, users*/ 0) {
    				each_value_2 = solveds[/*user*/ ctx[3].name];
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
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(details0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(details1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(11:1) {#each users as user, i}",
    		ctx
    	});

    	return block;
    }

    // (40:3) {#if problem.easy != ''}
    function create_if_block_2(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*problem*/ ctx[0].easy + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("easy: ");
    			t1 = text(t1_value);
    			add_location(p, file, 40, 3, 848);
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
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(40:3) {#if problem.easy != ''}",
    		ctx
    	});

    	return block;
    }

    // (43:3) {#if problem.medium != ''}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*problem*/ ctx[0].medium + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("medium: ");
    			t1 = text(t1_value);
    			add_location(p, file, 43, 4, 919);
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(43:3) {#if problem.medium != ''}",
    		ctx
    	});

    	return block;
    }

    // (46:3) {#if problem.hard != ''}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*problem*/ ctx[0].hard + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("hard: ");
    			t1 = text(t1_value);
    			add_location(p, file, 46, 4, 992);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(46:3) {#if problem.hard != ''}",
    		ctx
    	});

    	return block;
    }

    // (36:1) {#each problems as problem}
    function create_each_block(ctx) {
    	let h3;
    	let t0_value = /*problem*/ ctx[0].date + "";
    	let t0;
    	let t1;
    	let details;
    	let summary;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let if_block0 = /*problem*/ ctx[0].easy != '' && create_if_block_2(ctx);
    	let if_block1 = /*problem*/ ctx[0].medium != '' && create_if_block_1(ctx);
    	let if_block2 = /*problem*/ ctx[0].hard != '' && create_if_block(ctx);

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
    			add_location(h3, file, 36, 2, 754);
    			add_location(summary, file, 38, 3, 793);
    			add_location(details, file, 37, 2, 780);
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
    			if (/*problem*/ ctx[0].easy != '') if_block0.p(ctx, dirty);
    			if (/*problem*/ ctx[0].medium != '') if_block1.p(ctx, dirty);
    			if (/*problem*/ ctx[0].hard != '') if_block2.p(ctx, dirty);
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
    		source: "(36:1) {#each problems as problem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let hr0;
    	let t2;
    	let h20;
    	let t4;
    	let t5;
    	let hr1;
    	let t6;
    	let h21;
    	let t8;
    	let each_value_1 = users;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = problems;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Algorithm Challengers";
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			h20 = element("h2");
    			h20.textContent = "entry";
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			hr1 = element("hr");
    			t6 = space();
    			h21 = element("h2");
    			h21.textContent = "problems";
    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h1, file, 7, 1, 139);
    			add_location(hr0, file, 8, 1, 171);
    			add_location(h20, file, 9, 1, 179);
    			add_location(hr1, file, 33, 1, 697);
    			add_location(h21, file, 34, 1, 705);
    			add_location(main, file, 6, 0, 131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, hr0);
    			append_dev(main, t2);
    			append_dev(main, h20);
    			append_dev(main, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(main, null);
    			}

    			append_dev(main, t5);
    			append_dev(main, hr1);
    			append_dev(main, t6);
    			append_dev(main, h21);
    			append_dev(main, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*solveds, users*/ 0) {
    				each_value_1 = users;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(main, t5);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

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
    						each_blocks[i].m(main, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ users, problems, solveds });
    	return [];
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
