var aC=Object.defineProperty,cC=Object.defineProperties;var lC=Object.getOwnPropertyDescriptors;var k_=Object.getOwnPropertySymbols;var uC=Object.prototype.hasOwnProperty,dC=Object.prototype.propertyIsEnumerable;var U_=(n,e,t)=>e in n?aC(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t,he=(n,e)=>{for(var t in e||={})uC.call(e,t)&&U_(n,t,e[t]);if(k_)for(var t of k_(e))dC.call(e,t)&&U_(n,t,e[t]);return n},_t=(n,e)=>cC(n,lC(e));var Ja=[null],tu=[!1],Ts=1,fC=null,ln=Symbol("SIGNAL");function De(n){let e=Ja[0];return Ja[0]=n,e}function su(){return Ja[0]}var Mo={version:0,lastCleanEpoch:0,dirty:!1,producers:void 0,producersTail:void 0,consumers:void 0,consumersTail:void 0,recomputing:!1,consumerAllowSignalWrites:!1,consumerIsAlwaysLive:!1,kind:"unknown",producerMustRecompute:()=>!1,producerRecomputeValue:()=>{},consumerMarkedDirty:()=>{},consumerOnSignalRead:()=>{}};function Is(n){if(tu[0])throw new Error("");let e=Ja[0];if(e===null)return;e.consumerOnSignalRead(n);let t=e.producersTail;if(t!==void 0&&t.producer===n)return;let i,r=e.recomputing;if(r&&(i=t!==void 0?t.nextProducer:e.producers,i!==void 0&&i.producer===n)){e.producersTail=i,i.lastReadVersion=n.version,i.knownValidAtEpoch=Ts;return}let s=n.consumersTail;if(s!==void 0&&s.consumer===e&&(!r||s.knownValidAtEpoch===Ts))return;let o=wo(e),a={producer:n,consumer:e,nextProducer:i,prevConsumer:void 0,knownValidAtEpoch:Ts,lastReadVersion:n.version,nextConsumer:void 0};e.producersTail=a,t!==void 0?t.nextProducer=a:e.producers=a,o&&z_(n,a)}function B_(){Ts++}function Qa(n){if(!(wo(n)&&!n.dirty)&&!(!n.dirty&&n.lastCleanEpoch===Ts)){if(!n.producerMustRecompute(n)&&!ou(n)){ru(n);return}n.producerRecomputeValue(n),ru(n)}}function Cp(n){if(n.consumers===void 0)return;let e=tu[0];tu[0]=!0;try{for(let t=n.consumers;t!==void 0;t=t.nextConsumer){let i=t.consumer;i.dirty||hC(i)}}finally{tu[0]=e}}function Tp(){return Ja[0]?.consumerAllowSignalWrites!==!1}function hC(n){n.dirty=!0,Cp(n),n.consumerMarkedDirty?.(n)}function ru(n){n.dirty=!1,n.lastCleanEpoch=Ts}function bo(n){return n&&V_(n),De(n)}function V_(n){if(n.producersTail?.knownValidAtEpoch===Ts){let e=n.producers;for(;e!==void 0;)e.knownValidAtEpoch=null,e=e.nextProducer}n.producersTail=void 0,n.recomputing=!0}function ec(n,e){De(e),n&&H_(n)}function H_(n){n.recomputing=!1;let e=n.producersTail,t=e!==void 0?e.nextProducer:n.producers;if(t!==void 0){if(wo(n))do t=Dp(t);while(t!==void 0);e!==void 0?e.nextProducer=void 0:n.producers=void 0}}function ou(n){for(let e=n.producers;e!==void 0;e=e.nextProducer){let t=e.producer,i=e.lastReadVersion;if(i!==t.version||(Qa(t),i!==t.version))return!0}return!1}function tc(n){if(wo(n)){let e=n.producers;for(;e!==void 0;)e=Dp(e)}n.producers=void 0,n.producersTail=void 0,n.consumers=void 0,n.consumersTail=void 0}function z_(n,e){let t=n.consumersTail,i=wo(n);if(t!==void 0?(e.nextConsumer=t.nextConsumer,t.nextConsumer=e):(e.nextConsumer=void 0,n.consumers=e),e.prevConsumer=t,n.consumersTail=e,!i)for(let r=n.producers;r!==void 0;r=r.nextProducer)z_(r.producer,r)}function Dp(n){let e=n.producer,t=n.nextProducer,i=n.nextConsumer,r=n.prevConsumer;if(n.nextConsumer=void 0,n.prevConsumer=void 0,i!==void 0?i.prevConsumer=r:e.consumersTail=r,r!==void 0)r.nextConsumer=i;else if(e.consumers=i,!wo(e)){let s=e.producers;for(;s!==void 0;)s=Dp(s)}return t}function wo(n){return n.consumerIsAlwaysLive||n.consumers!==void 0}function au(n){fC?.(n)}function cu(n,e){return Object.is(n,e)}function nc(n,e){let t=Object.create(pC);t.computation=n,e!==void 0&&(t.equal=e);let i=()=>{if(Qa(t),Is(t),t.value===Ds)throw t.error;return t.value};return i[ln]=t,au(t),i}var nu=Symbol("UNSET"),iu=Symbol("COMPUTING"),Ds=Symbol("ERRORED"),pC=_t(he({},Mo),{value:nu,dirty:!0,error:null,equal:cu,kind:"computed",producerMustRecompute(n){return n.value===nu||n.value===iu},producerRecomputeValue(n){if(n.value===iu)throw new Error("");let e=n.value;n.value=iu;let t=bo(n),i,r=!1;try{i=n.computation(),De(null),r=e!==nu&&e!==Ds&&i!==Ds&&n.equal(e,i)}catch(s){i=Ds,n.error=s}finally{ec(n,t)}if(r){n.value=e;return}n.value=i,n.version++}});function mC(){throw new Error}var G_=mC;function j_(n){G_(n)}function Ip(n){G_=n}var gC=null;function Ap(n,e){let t=Object.create(ic);t.value=n,e!==void 0&&(t.equal=e);let i=()=>W_(t);return i[ln]=t,au(t),[i,o=>As(t,o),o=>Rp(t,o)]}function W_(n){return Is(n),n.value}function As(n,e){Tp()||j_(n),n.equal(n.value,e)||(n.value=e,vC(n))}function Rp(n,e){Tp()||j_(n),As(n,e(n.value))}var ic=_t(he({},Mo),{equal:cu,value:void 0,kind:"signal"});function vC(n){n.version++,B_(),Cp(n),gC?.(n)}var Np=[void 0];function lu(){return Np[0]}function Ii(n){let e=Np[0];return Np[0]=n,e}var $_=Symbol("NotFound");function Co(n){return n===$_||n?.name==="\u0275NotFound"}function q_(n){let e=De(null);try{return n()}finally{De(e)}}function $e(n){return typeof n=="function"}function To(n){let t=n(i=>{Error.call(i),i.stack=new Error().stack});return t.prototype=Object.create(Error.prototype),t.prototype.constructor=t,t}var uu=To(n=>function(t){n(this),this.message=t?`${t.length} errors occurred during unsubscription:
${t.map((i,r)=>`${r+1}) ${i.toString()}`).join(`
  `)}`:"",this.name="UnsubscriptionError",this.errors=t});function rc(n,e){if(n){let t=n.indexOf(e);0<=t&&n.splice(t,1)}}var un=class n{constructor(e){this.initialTeardown=e,this.closed=!1,this._parentage=null,this._finalizers=null}unsubscribe(){let e;if(!this.closed){this.closed=!0;let{_parentage:t}=this;if(t)if(this._parentage=null,Array.isArray(t))for(let s of t)s.remove(this);else t.remove(this);let{initialTeardown:i}=this;if($e(i))try{i()}catch(s){e=s instanceof uu?s.errors:[s]}let{_finalizers:r}=this;if(r){this._finalizers=null;for(let s of r)try{X_(s)}catch(o){e=e??[],o instanceof uu?e=[...e,...o.errors]:e.push(o)}}if(e)throw new uu(e)}}add(e){var t;if(e&&e!==this)if(this.closed)X_(e);else{if(e instanceof n){if(e.closed||e._hasParent(this))return;e._addParent(this)}(this._finalizers=(t=this._finalizers)!==null&&t!==void 0?t:[]).push(e)}}_hasParent(e){let{_parentage:t}=this;return t===e||Array.isArray(t)&&t.includes(e)}_addParent(e){let{_parentage:t}=this;this._parentage=Array.isArray(t)?(t.push(e),t):t?[t,e]:e}_removeParent(e){let{_parentage:t}=this;t===e?this._parentage=null:Array.isArray(t)&&rc(t,e)}remove(e){let{_finalizers:t}=this;t&&rc(t,e),e instanceof n&&e._removeParent(this)}};un.EMPTY=(()=>{let n=new un;return n.closed=!0,n})();var Pp=un.EMPTY;function du(n){return n instanceof un||n&&"closed"in n&&$e(n.remove)&&$e(n.add)&&$e(n.unsubscribe)}function X_(n){$e(n)?n():n.unsubscribe()}var ui={onUnhandledError:null,onStoppedNotification:null,Promise:void 0,useDeprecatedSynchronousErrorHandling:!1,useDeprecatedNextContext:!1};var Do={setTimeout(n,e,...t){let{delegate:i}=Do;return i?.setTimeout?i.setTimeout(n,e,...t):setTimeout(n,e,...t)},clearTimeout(n){let{delegate:e}=Do;return(e?.clearTimeout||clearTimeout)(n)},delegate:void 0};function fu(n){Do.setTimeout(()=>{let{onUnhandledError:e}=ui;if(e)e(n);else throw n})}function sc(){}var Y_=Op("C",void 0,void 0);function Z_(n){return Op("E",void 0,n)}function K_(n){return Op("N",n,void 0)}function Op(n,e,t){return{kind:n,value:e,error:t}}var Rs=null;function Io(n){if(ui.useDeprecatedSynchronousErrorHandling){let e=!Rs;if(e&&(Rs={errorThrown:!1,error:null}),n(),e){let{errorThrown:t,error:i}=Rs;if(Rs=null,t)throw i}}else n()}function J_(n){ui.useDeprecatedSynchronousErrorHandling&&Rs&&(Rs.errorThrown=!0,Rs.error=n)}var Ns=class extends un{constructor(e){super(),this.isStopped=!1,e?(this.destination=e,du(e)&&e.add(this)):this.destination=EC}static create(e,t,i){return new Ao(e,t,i)}next(e){this.isStopped?Fp(K_(e),this):this._next(e)}error(e){this.isStopped?Fp(Z_(e),this):(this.isStopped=!0,this._error(e))}complete(){this.isStopped?Fp(Y_,this):(this.isStopped=!0,this._complete())}unsubscribe(){this.closed||(this.isStopped=!0,super.unsubscribe(),this.destination=null)}_next(e){this.destination.next(e)}_error(e){try{this.destination.error(e)}finally{this.unsubscribe()}}_complete(){try{this.destination.complete()}finally{this.unsubscribe()}}},xC=Function.prototype.bind;function Lp(n,e){return xC.call(n,e)}var kp=class{constructor(e){this.partialObserver=e}next(e){let{partialObserver:t}=this;if(t.next)try{t.next(e)}catch(i){hu(i)}}error(e){let{partialObserver:t}=this;if(t.error)try{t.error(e)}catch(i){hu(i)}else hu(e)}complete(){let{partialObserver:e}=this;if(e.complete)try{e.complete()}catch(t){hu(t)}}},Ao=class extends Ns{constructor(e,t,i){super();let r;if($e(e)||!e)r={next:e??void 0,error:t??void 0,complete:i??void 0};else{let s;this&&ui.useDeprecatedNextContext?(s=Object.create(e),s.unsubscribe=()=>this.unsubscribe(),r={next:e.next&&Lp(e.next,s),error:e.error&&Lp(e.error,s),complete:e.complete&&Lp(e.complete,s)}):r=e}this.destination=new kp(r)}};function hu(n){ui.useDeprecatedSynchronousErrorHandling?J_(n):fu(n)}function SC(n){throw n}function Fp(n,e){let{onStoppedNotification:t}=ui;t&&Do.setTimeout(()=>t(n,e))}var EC={closed:!0,next:sc,error:SC,complete:sc};var Ro=typeof Symbol=="function"&&Symbol.observable||"@@observable";function di(n){return n}function pu(...n){return Up(n)}function Up(n){return n.length===0?di:n.length===1?n[0]:function(t){return n.reduce((i,r)=>r(i),t)}}var st=class n{constructor(e){e&&(this._subscribe=e)}lift(e){let t=new n;return t.source=this,t.operator=e,t}subscribe(e,t,i){let r=bC(e)?e:new Ao(e,t,i);return Io(()=>{let{operator:s,source:o}=this;r.add(s?s.call(r,o):o?this._subscribe(r):this._trySubscribe(r))}),r}_trySubscribe(e){try{return this._subscribe(e)}catch(t){e.error(t)}}forEach(e,t){return t=Q_(t),new t((i,r)=>{let s=new Ao({next:o=>{try{e(o)}catch(a){r(a),s.unsubscribe()}},error:r,complete:i});this.subscribe(s)})}_subscribe(e){var t;return(t=this.source)===null||t===void 0?void 0:t.subscribe(e)}[Ro](){return this}pipe(...e){return Up(e)(this)}toPromise(e){return e=Q_(e),new e((t,i)=>{let r;this.subscribe(s=>r=s,s=>i(s),()=>t(r))})}};st.create=n=>new st(n);function Q_(n){var e;return(e=n??ui.Promise)!==null&&e!==void 0?e:Promise}function MC(n){return n&&$e(n.next)&&$e(n.error)&&$e(n.complete)}function bC(n){return n&&n instanceof Ns||MC(n)&&du(n)}function wC(n){return $e(n?.lift)}function pt(n){return e=>{if(wC(e))return e.lift(function(t){try{return n(t,this)}catch(i){this.error(i)}});throw new TypeError("Unable to lift unknown Observable type")}}function xt(n,e,t,i,r){return new Bp(n,e,t,i,r)}var Bp=class extends Ns{constructor(e,t,i,r,s,o){super(e),this.onFinalize=s,this.shouldUnsubscribe=o,this._next=t?function(a){try{t(a)}catch(c){e.error(c)}}:super._next,this._error=r?function(a){try{r(a)}catch(c){e.error(c)}finally{this.unsubscribe()}}:super._error,this._complete=i?function(){try{i()}catch(a){e.error(a)}finally{this.unsubscribe()}}:super._complete}unsubscribe(){var e;if(!this.shouldUnsubscribe||this.shouldUnsubscribe()){let{closed:t}=this;super.unsubscribe(),!t&&((e=this.onFinalize)===null||e===void 0||e.call(this))}}};var e0=To(n=>function(){n(this),this.name="ObjectUnsubscribedError",this.message="object unsubscribed"});var Bt=class extends st{constructor(){super(),this.closed=!1,this.currentObservers=null,this.observers=[],this.isStopped=!1,this.hasError=!1,this.thrownError=null}lift(e){let t=new mu(this,this);return t.operator=e,t}_throwIfClosed(){if(this.closed)throw new e0}next(e){Io(()=>{if(this._throwIfClosed(),!this.isStopped){this.currentObservers||(this.currentObservers=Array.from(this.observers));for(let t of this.currentObservers)t.next(e)}})}error(e){Io(()=>{if(this._throwIfClosed(),!this.isStopped){this.hasError=this.isStopped=!0,this.thrownError=e;let{observers:t}=this;for(;t.length;)t.shift().error(e)}})}complete(){Io(()=>{if(this._throwIfClosed(),!this.isStopped){this.isStopped=!0;let{observers:e}=this;for(;e.length;)e.shift().complete()}})}unsubscribe(){this.isStopped=this.closed=!0,this.observers=this.currentObservers=null}get observed(){var e;return((e=this.observers)===null||e===void 0?void 0:e.length)>0}_trySubscribe(e){return this._throwIfClosed(),super._trySubscribe(e)}_subscribe(e){return this._throwIfClosed(),this._checkFinalizedStatuses(e),this._innerSubscribe(e)}_innerSubscribe(e){let{hasError:t,isStopped:i,observers:r}=this;return t||i?Pp:(this.currentObservers=null,r.push(e),new un(()=>{this.currentObservers=null,rc(r,e)}))}_checkFinalizedStatuses(e){let{hasError:t,thrownError:i,isStopped:r}=this;t?e.error(i):r&&e.complete()}asObservable(){let e=new st;return e.source=this,e}};Bt.create=(n,e)=>new mu(n,e);var mu=class extends Bt{constructor(e,t){super(),this.destination=e,this.source=t}next(e){var t,i;(i=(t=this.destination)===null||t===void 0?void 0:t.next)===null||i===void 0||i.call(t,e)}error(e){var t,i;(i=(t=this.destination)===null||t===void 0?void 0:t.error)===null||i===void 0||i.call(t,e)}complete(){var e,t;(t=(e=this.destination)===null||e===void 0?void 0:e.complete)===null||t===void 0||t.call(e)}_subscribe(e){var t,i;return(i=(t=this.source)===null||t===void 0?void 0:t.subscribe(e))!==null&&i!==void 0?i:Pp}};var dn=class extends Bt{constructor(e){super(),this._value=e}get value(){return this.getValue()}_subscribe(e){let t=super._subscribe(e);return!t.closed&&e.next(this._value),t}getValue(){let{hasError:e,thrownError:t,_value:i}=this;if(e)throw t;return this._throwIfClosed(),i}next(e){super.next(this._value=e)}};var fn=new st(n=>n.complete());function t0(n){return n&&$e(n.schedule)}function n0(n){return n[n.length-1]}function i0(n){return $e(n0(n))?n.pop():void 0}function Gr(n){return t0(n0(n))?n.pop():void 0}function s0(n,e,t,i){function r(s){return s instanceof t?s:new t(function(o){o(s)})}return new(t||(t=Promise))(function(s,o){function a(u){try{l(i.next(u))}catch(d){o(d)}}function c(u){try{l(i.throw(u))}catch(d){o(d)}}function l(u){u.done?s(u.value):r(u.value).then(a,c)}l((i=i.apply(n,e||[])).next())})}function r0(n){var e=typeof Symbol=="function"&&Symbol.iterator,t=e&&n[e],i=0;if(t)return t.call(n);if(n&&typeof n.length=="number")return{next:function(){return n&&i>=n.length&&(n=void 0),{value:n&&n[i++],done:!n}}};throw new TypeError(e?"Object is not iterable.":"Symbol.iterator is not defined.")}function Ps(n){return this instanceof Ps?(this.v=n,this):new Ps(n)}function o0(n,e,t){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var i=t.apply(n,e||[]),r,s=[];return r=Object.create((typeof AsyncIterator=="function"?AsyncIterator:Object).prototype),a("next"),a("throw"),a("return",o),r[Symbol.asyncIterator]=function(){return this},r;function o(h){return function(g){return Promise.resolve(g).then(h,d)}}function a(h,g){i[h]&&(r[h]=function(x){return new Promise(function(p,m){s.push([h,x,p,m])>1||c(h,x)})},g&&(r[h]=g(r[h])))}function c(h,g){try{l(i[h](g))}catch(x){f(s[0][3],x)}}function l(h){h.value instanceof Ps?Promise.resolve(h.value.v).then(u,d):f(s[0][2],h)}function u(h){c("next",h)}function d(h){c("throw",h)}function f(h,g){h(g),s.shift(),s.length&&c(s[0][0],s[0][1])}}function a0(n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var e=n[Symbol.asyncIterator],t;return e?e.call(n):(n=typeof r0=="function"?r0(n):n[Symbol.iterator](),t={},i("next"),i("throw"),i("return"),t[Symbol.asyncIterator]=function(){return this},t);function i(s){t[s]=n[s]&&function(o){return new Promise(function(a,c){o=n[s](o),r(a,c,o.done,o.value)})}}function r(s,o,a,c){Promise.resolve(c).then(function(l){s({value:l,done:a})},o)}}var gu=(n=>n&&typeof n.length=="number"&&typeof n!="function");function vu(n){return $e(n?.then)}function yu(n){return $e(n[Ro])}function _u(n){return Symbol.asyncIterator&&$e(n?.[Symbol.asyncIterator])}function xu(n){return new TypeError(`You provided ${n!==null&&typeof n=="object"?"an invalid object":`'${n}'`} where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.`)}function CC(){return typeof Symbol!="function"||!Symbol.iterator?"@@iterator":Symbol.iterator}var Su=CC();function Eu(n){return $e(n?.[Su])}function Mu(n){return o0(this,arguments,function*(){let t=n.getReader();try{for(;;){let{value:i,done:r}=yield Ps(t.read());if(r)return yield Ps(void 0);yield yield Ps(i)}}finally{t.releaseLock()}})}function bu(n){return $e(n?.getReader)}function tn(n){if(n instanceof st)return n;if(n!=null){if(yu(n))return TC(n);if(gu(n))return DC(n);if(vu(n))return IC(n);if(_u(n))return c0(n);if(Eu(n))return AC(n);if(bu(n))return RC(n)}throw xu(n)}function TC(n){return new st(e=>{let t=n[Ro]();if($e(t.subscribe))return t.subscribe(e);throw new TypeError("Provided object does not correctly implement Symbol.observable")})}function DC(n){return new st(e=>{for(let t=0;t<n.length&&!e.closed;t++)e.next(n[t]);e.complete()})}function IC(n){return new st(e=>{n.then(t=>{e.closed||(e.next(t),e.complete())},t=>e.error(t)).then(null,fu)})}function AC(n){return new st(e=>{for(let t of n)if(e.next(t),e.closed)return;e.complete()})}function c0(n){return new st(e=>{NC(n,e).catch(t=>e.error(t))})}function RC(n){return c0(Mu(n))}function NC(n,e){var t,i,r,s;return s0(this,void 0,void 0,function*(){try{for(t=a0(n);i=yield t.next(),!i.done;){let o=i.value;if(e.next(o),e.closed)return}}catch(o){r={error:o}}finally{try{i&&!i.done&&(s=t.return)&&(yield s.call(t))}finally{if(r)throw r.error}}e.complete()})}function Nn(n,e,t,i=0,r=!1){let s=e.schedule(function(){t(),r?n.add(this.schedule(null,i)):this.unsubscribe()},i);if(n.add(s),!r)return s}function wu(n,e=0){return pt((t,i)=>{t.subscribe(xt(i,r=>Nn(i,n,()=>i.next(r),e),()=>Nn(i,n,()=>i.complete(),e),r=>Nn(i,n,()=>i.error(r),e)))})}function Cu(n,e=0){return pt((t,i)=>{i.add(n.schedule(()=>t.subscribe(i),e))})}function l0(n,e){return tn(n).pipe(Cu(e),wu(e))}function u0(n,e){return tn(n).pipe(Cu(e),wu(e))}function d0(n,e){return new st(t=>{let i=0;return e.schedule(function(){i===n.length?t.complete():(t.next(n[i++]),t.closed||this.schedule())})})}function f0(n,e){return new st(t=>{let i;return Nn(t,e,()=>{i=n[Su](),Nn(t,e,()=>{let r,s;try{({value:r,done:s}=i.next())}catch(o){t.error(o);return}s?t.complete():t.next(r)},0,!0)}),()=>$e(i?.return)&&i.return()})}function Tu(n,e){if(!n)throw new Error("Iterable cannot be null");return new st(t=>{Nn(t,e,()=>{let i=n[Symbol.asyncIterator]();Nn(t,e,()=>{i.next().then(r=>{r.done?t.complete():t.next(r.value)})},0,!0)})})}function h0(n,e){return Tu(Mu(n),e)}function p0(n,e){if(n!=null){if(yu(n))return l0(n,e);if(gu(n))return d0(n,e);if(vu(n))return u0(n,e);if(_u(n))return Tu(n,e);if(Eu(n))return f0(n,e);if(bu(n))return h0(n,e)}throw xu(n)}function Vt(n,e){return e?p0(n,e):tn(n)}function tt(...n){let e=Gr(n);return Vt(n,e)}function Vp(n,e){let t=$e(n)?n:()=>n,i=r=>r.error(t());return new st(e?r=>e.schedule(i,0,r):i)}function Du(n){return!!n&&(n instanceof st||$e(n.lift)&&$e(n.subscribe))}var Os=To(n=>function(){n(this),this.name="EmptyError",this.message="no elements in sequence"});function Pt(n,e){return pt((t,i)=>{let r=0;t.subscribe(xt(i,s=>{i.next(n.call(e,s,r++))}))})}var{isArray:PC}=Array;function OC(n,e){return PC(e)?n(...e):n(e)}function m0(n){return Pt(e=>OC(n,e))}var{isArray:LC}=Array,{getPrototypeOf:FC,prototype:kC,keys:UC}=Object;function g0(n){if(n.length===1){let e=n[0];if(LC(e))return{args:e,keys:null};if(BC(e)){let t=UC(e);return{args:t.map(i=>e[i]),keys:t}}}return{args:n,keys:null}}function BC(n){return n&&typeof n=="object"&&FC(n)===kC}function v0(n,e){return n.reduce((t,i,r)=>(t[i]=e[r],t),{})}function Hp(...n){let e=Gr(n),t=i0(n),{args:i,keys:r}=g0(n);if(i.length===0)return Vt([],e);let s=new st(VC(i,e,r?o=>v0(r,o):di));return t?s.pipe(m0(t)):s}function VC(n,e,t=di){return i=>{y0(e,()=>{let{length:r}=n,s=new Array(r),o=r,a=r;for(let c=0;c<r;c++)y0(e,()=>{let l=Vt(n[c],e),u=!1;l.subscribe(xt(i,d=>{s[c]=d,u||(u=!0,a--),a||i.next(t(s.slice()))},()=>{--o||i.complete()}))},i)},i)}}function y0(n,e,t){n?Nn(t,n,e):e()}function _0(n,e,t,i,r,s,o,a){let c=[],l=0,u=0,d=!1,f=()=>{d&&!c.length&&!l&&e.complete()},h=x=>l<i?g(x):c.push(x),g=x=>{s&&e.next(x),l++;let p=!1;tn(t(x,u++)).subscribe(xt(e,m=>{r?.(m),s?h(m):e.next(m)},()=>{p=!0},void 0,()=>{if(p)try{for(l--;c.length&&l<i;){let m=c.shift();o?Nn(e,o,()=>g(m)):g(m)}f()}catch(m){e.error(m)}}))};return n.subscribe(xt(e,h,()=>{d=!0,f()})),()=>{a?.()}}function wn(n,e,t=1/0){return $e(e)?wn((i,r)=>Pt((s,o)=>e(i,s,r,o))(tn(n(i,r))),t):(typeof e=="number"&&(t=e),pt((i,r)=>_0(i,r,n,t)))}function x0(n=1/0){return wn(di,n)}function S0(){return x0(1)}function No(...n){return S0()(Vt(n,Gr(n)))}function oc(n){return new st(e=>{tn(n()).subscribe(e)})}function cr(n,e){return pt((t,i)=>{let r=0;t.subscribe(xt(i,s=>n.call(e,s,r++)&&i.next(s)))})}function Po(n){return pt((e,t)=>{let i=null,r=!1,s;i=e.subscribe(xt(t,void 0,void 0,o=>{s=tn(n(o,Po(n)(e))),i?(i.unsubscribe(),i=null,s.subscribe(t)):r=!0})),r&&(i.unsubscribe(),i=null,s.subscribe(t))})}function Iu(n,e){return $e(e)?wn(n,e,1):wn(n,1)}function E0(n){return pt((e,t)=>{let i=!1;e.subscribe(xt(t,r=>{i=!0,t.next(r)},()=>{i||t.next(n),t.complete()}))})}function jr(n){return n<=0?()=>fn:pt((e,t)=>{let i=0;e.subscribe(xt(t,r=>{++i<=n&&(t.next(r),n<=i&&t.complete())}))})}function M0(n=HC){return pt((e,t)=>{let i=!1;e.subscribe(xt(t,r=>{i=!0,t.next(r)},()=>i?t.complete():t.error(n())))})}function HC(){return new Os}function zp(n){return pt((e,t)=>{try{e.subscribe(t)}finally{t.add(n)}})}function lr(n,e){let t=arguments.length>=2;return i=>i.pipe(n?cr((r,s)=>n(r,s,i)):di,jr(1),t?E0(e):M0(()=>new Os))}function Au(n){return n<=0?()=>fn:pt((e,t)=>{let i=[];e.subscribe(xt(t,r=>{i.push(r),n<i.length&&i.shift()},()=>{for(let r of i)t.next(r);t.complete()},void 0,()=>{i=null}))})}function Gp(...n){let e=Gr(n);return pt((t,i)=>{(e?No(n,t,e):No(n,t)).subscribe(i)})}function Qn(n,e){return pt((t,i)=>{let r=null,s=0,o=!1,a=()=>o&&!r&&i.complete();t.subscribe(xt(i,c=>{r?.unsubscribe();let l=0,u=s++;tn(n(c,u)).subscribe(r=xt(i,d=>i.next(e?e(c,d,u,l++):d),()=>{r=null,a()}))},()=>{o=!0,a()}))})}function ac(n){return pt((e,t)=>{tn(n).subscribe(xt(t,()=>t.complete(),sc)),!t.closed&&e.subscribe(t)})}function ei(n,e,t){let i=$e(n)||e||t?{next:n,error:e,complete:t}:n;return i?pt((r,s)=>{var o;(o=i.subscribe)===null||o===void 0||o.call(i);let a=!0;r.subscribe(xt(s,c=>{var l;(l=i.next)===null||l===void 0||l.call(i,c),s.next(c)},()=>{var c;a=!1,(c=i.complete)===null||c===void 0||c.call(i),s.complete()},c=>{var l;a=!1,(l=i.error)===null||l===void 0||l.call(i,c),s.error(c)},()=>{var c,l;a&&((c=i.unsubscribe)===null||c===void 0||c.call(i)),(l=i.finalize)===null||l===void 0||l.call(i)}))}):di}var Ce=class extends Error{code;constructor(e,t){super(dc(e,t)),this.code=e}};function zC(n){return`NG0${Math.abs(n)}`}function dc(n,e){return`${zC(n)}${e?": "+e:""}`}function mt(n){for(let e in n)if(n[e]===mt)return e;throw Error("")}function fc(n){if(typeof n=="string")return n;if(Array.isArray(n))return`[${n.map(fc).join(", ")}]`;if(n==null)return""+n;let e=n.overriddenName||n.name;if(e)return`${e}`;let t=n.toString();if(t==null)return""+t;let i=t.indexOf(`
`);return i>=0?t.slice(0,i):t}function om(n,e){return n?e?`${n} ${e}`:n:e||""}var GC=mt({__forward_ref__:mt});function Fu(n){return n.__forward_ref__=Fu,n}function Bn(n){return D0(n)?n():n}function D0(n){return typeof n=="function"&&Object.hasOwn(n,GC)&&n.__forward_ref__===Fu}function ut(n){return{token:n.token,providedIn:n.providedIn||null,factory:n.factory,value:void 0}}function hc(n){return jC(n,ku)}function am(n){return hc(n)!==null}function jC(n,e){return Object.hasOwn(n,e)&&n[e]||null}function WC(n){let e=n?.[ku]??null;return e||null}function Wp(n){return n&&Object.hasOwn(n,Nu)?n[Nu]:null}var ku=mt({\u0275prov:mt}),Nu=mt({\u0275inj:mt}),Pe=class{_desc;ngMetadataName="InjectionToken";\u0275prov;constructor(e,t){this._desc=e,this.\u0275prov=void 0,typeof t=="number"?this.__NG_ELEMENT_ID__=t:t!==void 0&&(this.\u0275prov=ut({token:this,providedIn:t.providedIn||"root",factory:t.factory}))}get multi(){return this}toString(){return`InjectionToken ${this._desc}`}};function cm(n){return n&&!!n.\u0275providers}var lm=mt({\u0275cmp:mt}),um=mt({\u0275dir:mt}),dm=mt({\u0275pipe:mt}),fm=mt({\u0275mod:mt}),$p=mt({\u0275fac:mt}),Us=mt({__NG_ELEMENT_ID__:mt}),b0=mt({__NG_ENV_ID__:mt});function I0(n){return Bu(n,"@NgModule"),n[fm]||null}function Bs(n){return Bu(n,"@Component"),n[lm]||null}function Uu(n){return Bu(n,"@Directive"),n[um]||null}function A0(n){return Bu(n,"@Pipe"),n[dm]||null}function Bu(n,e){if(n==null)throw new Ce(-919,!1)}function pc(n){return typeof n=="string"?n:n==null?"":String(n)}var R0=mt({ngErrorCode:mt}),$C=mt({ngErrorMessage:mt}),qC=mt({ngTokenPath:mt});function hm(n,e){return N0("",-200,e)}function Vu(n,e){throw new Ce(-201,!1)}function N0(n,e,t){let i=new Ce(e,n);return i[R0]=e,i[$C]=n,t&&(i[qC]=t),i}function XC(n){return n[R0]}var qp;function P0(){return qp}function Un(n){let e=qp;return qp=n,e}function pm(n,e,t){let i=hc(n);if(i&&i.providedIn=="root")return i.value===void 0?i.value=i.factory():i.value;if(t&8)return null;if(e!==void 0)return e;Vu(n,"")}var YC={},Ls=YC,ZC="__NG_DI_FLAG__",Xp=class{injector;constructor(e){this.injector=e}retrieve(e,t){let i=Fs(t)||0;try{return this.injector.get(e,i&8?null:Ls,i)}catch(r){if(Co(r))return r;throw r}}};function KC(n,e=0){let t=lu();if(t===void 0)throw new Ce(-203,!1);if(t===null)return pm(n,void 0,e);{let i=JC(e),r=t.retrieve(n,i);if(Co(r)){if(i.optional)return null;throw r}return r}}function qe(n,e=0){return(P0()||KC)(Bn(n),e)}function re(n,e){return qe(n,Fs(e))}function Fs(n){return typeof n>"u"||typeof n=="number"?n:0|(n.optional&&8)|(n.host&&1)|(n.self&&2)|(n.skipSelf&&4)}function JC(n){return{optional:!!(n&8),host:!!(n&1),self:!!(n&2),skipSelf:!!(n&4)}}function Yp(n){let e=[];for(let t=0;t<n.length;t++){let i=Bn(n[t]);if(Array.isArray(i)){if(i.length===0)throw new Ce(900,!1);let r,s=0;for(let o=0;o<i.length;o++){let a=i[o],c=QC(a);typeof c=="number"?c===-1?r=a.token:s|=c:r=a}e.push(qe(r,s))}else e.push(qe(i))}return e}function QC(n){return n[ZC]}function Lo(n,e){let t=Object.hasOwn(n,$p);return t?n[$p]:null}function O0(n,e,t){if(n.length!==e.length)return!1;for(let i=0;i<n.length;i++){let r=n[i],s=e[i];if(t&&(r=t(r),s=t(s)),s!==r)return!1}return!0}function L0(n){return n.flat(Number.POSITIVE_INFINITY)}function Hu(n,e){n.forEach(t=>Array.isArray(t)?Hu(t,e):e(t))}function mm(n,e,t){e>=n.length?n.push(t):n.splice(e,0,t)}function mc(n,e){return e>=n.length-1?n.pop():n.splice(e,1)[0]}function F0(n,e,t,i){let r=n.length;if(r==e)n.push(t,i);else if(r===1)n.push(i,n[0]),n[0]=t;else{for(r--,n.push(n[r-1],n[r]);r>e;){let s=r-2;n[r]=n[s],r--}n[e]=t,n[e+1]=i}}function k0(n,e,t){let i=Uo(n,e);return i>=0?n[i|1]=t:(i=~i,F0(n,i,e,t)),i}function zu(n,e){let t=Uo(n,e);if(t>=0)return n[t|1]}function Uo(n,e){return eT(n,e,1)}function eT(n,e,t){let i=0,r=n.length>>t;for(;r!==i;){let s=i+(r-i>>1),o=n[s<<t];if(e===o)return s<<t;o>e?r=s:i=s+1}return~(r<<t)}var Vs={},dr=[],Bo=new Pe(""),gm=new Pe("",-1),vm=new Pe(""),Fo=class{get(e,t=Ls){if(t===Ls){let r=N0("",-201);throw r.name="\u0275NotFound",r}return t}};function Hs(n){return{\u0275providers:n}}function U0(n){return Hs([{provide:Bo,multi:!0,useValue:n}])}function B0(...n){return{\u0275providers:ym(!0,n),\u0275fromNgModule:!0}}function ym(n,...e){let t=[],i=new Set,r,s=o=>{t.push(o)};return Hu(e,o=>{let a=o;Pu(a,s,[],i)&&(r||=[],r.push(a))}),r!==void 0&&V0(r,s),t}function V0(n,e){for(let t=0;t<n.length;t++){let{ngModule:i,providers:r}=n[t];_m(r,s=>{e(s,i)})}}function Pu(n,e,t,i){if(n=Bn(n),!n)return!1;let r=null,s=Wp(n),o=!s&&Bs(n);if(!s&&!o){let c=n.ngModule;if(s=Wp(c),s)r=c;else return!1}else{if(o&&!o.standalone)return!1;r=n}let a=i.has(r);if(o){if(a)return!1;if(i.add(r),o.dependencies){let c=typeof o.dependencies=="function"?o.dependencies():o.dependencies;for(let l of c)Pu(l,e,t,i)}}else if(s){if(s.imports!=null&&!a){i.add(r);let l;Hu(s.imports,u=>{Pu(u,e,t,i)&&(l||=[],l.push(u))}),l!==void 0&&V0(l,e)}if(!a){let l=Lo(r)||(()=>new r);e({provide:r,useFactory:l,deps:dr},r),e({provide:vm,useValue:r,multi:!0},r),e({provide:Bo,useValue:()=>qe(r),multi:!0},r)}let c=s.providers;if(c!=null&&!a){let l=n;_m(c,u=>{e(u,l)})}}else return!1;return r!==n&&n.providers!==void 0}function _m(n,e){for(let t of n)cm(t)&&(t=t.\u0275providers),Array.isArray(t)?_m(t,e):e(t)}var tT=mt({provide:String,useValue:mt});function H0(n){return n!==null&&typeof n=="object"&&tT in n}function nT(n){return!!(n&&n.useExisting)}function iT(n){return!!(n&&n.useFactory)}function Ou(n){return typeof n=="function"}var gc=new Pe(""),Ru={},w0={},jp;function vc(){return jp===void 0&&(jp=new Fo),jp}var nn=class{},ks=class extends nn{parent;source;scopes;records=new Map;_ngOnDestroyHooks=new Set;_onDestroyHooks=[];get destroyed(){return this._destroyed}_destroyed=!1;injectorDefTypes;constructor(e,t,i,r){super(),this.parent=t,this.source=i,this.scopes=r,Kp(e,o=>this.processProvider(o)),this.records.set(gm,Oo(void 0,this)),r.has("environment")&&this.records.set(nn,Oo(void 0,this));let s=this.records.get(gc);s!=null&&typeof s.value=="string"&&this.scopes.add(s.value),this.injectorDefTypes=new Set(this.get(vm,dr,{self:!0}))}retrieve(e,t){let i=Fs(t)||0;try{return this.get(e,Ls,i)}catch(r){if(Co(r))return r;throw r}}destroy(){cc(this),this._destroyed=!0;let e=De(null);try{for(let i of this._ngOnDestroyHooks)i.ngOnDestroy();let t=this._onDestroyHooks;this._onDestroyHooks=[];for(let i of t)i()}finally{this.records.clear(),this._ngOnDestroyHooks.clear(),this.injectorDefTypes.clear(),De(e)}}onDestroy(e){return cc(this),this._onDestroyHooks.push(e),()=>this.removeOnDestroy(e)}runInContext(e){cc(this);let t=Ii(this),i=Un(void 0),r;try{return e()}finally{Ii(t),Un(i)}}get(e,t=Ls,i){if(cc(this),Object.hasOwn(e,b0))return e[b0](this);let r=Fs(i),s,o=Ii(this),a=Un(void 0);try{if(!(r&4)){let l=this.records.get(e);if(l===void 0){let u=cT(e)&&hc(e);u&&this.injectableDefInScope(u)?l=Oo(Zp(e),Ru):l=null,this.records.set(e,l)}if(l!=null)return this.hydrate(e,l,r)}let c=r&2?vc():this.parent;return t=r&8&&t===Ls?null:t,c.get(e,t)}catch(c){let l=XC(c);throw l===-200||l===-201?new Ce(l,null):c}finally{Un(a),Ii(o)}}resolveInjectorInitializers(){let e=De(null),t=Ii(this),i=Un(void 0),r;try{let s=this.get(Bo,dr,{self:!0});for(let o of s)o()}finally{Ii(t),Un(i),De(e)}}toString(){return"R3Injector[...]"}processProvider(e){e=Bn(e);let t=Ou(e)?e:Bn(e&&e.provide),i=sT(e);if(!Ou(e)&&e.multi===!0){let r=this.records.get(t);r||(r=Oo(void 0,Ru,!0),r.factory=()=>Yp(r.multi),this.records.set(t,r)),t=e,r.multi.push(e)}this.records.set(t,i)}hydrate(e,t,i){let r=De(null);try{if(t.value===w0)throw hm("");return t.value===Ru&&(t.value=w0,t.value=t.factory(void 0,i)),typeof t.value=="object"&&t.value&&aT(t.value)&&this._ngOnDestroyHooks.add(t.value),t.value}finally{De(r)}}injectableDefInScope(e){if(!e.providedIn)return!1;let t=Bn(e.providedIn);return typeof t=="string"?t==="any"||this.scopes.has(t):this.injectorDefTypes.has(t)}removeOnDestroy(e){let t=this._onDestroyHooks.indexOf(e);t!==-1&&this._onDestroyHooks.splice(t,1)}};function Zp(n){let e=hc(n),t=e!==null?e.factory:Lo(n);if(t!==null)return t;if(n instanceof Pe)throw new Ce(-204,!1);if(n instanceof Function)return rT(n);throw new Ce(-204,!1)}function rT(n){if(n.length>0)throw new Ce(-204,!1);let t=WC(n);return t!==null?()=>t.factory(n):()=>new n}function sT(n){if(H0(n))return Oo(void 0,n.useValue);{let e=z0(n);return Oo(e,Ru)}}function z0(n,e,t){let i;if(Ou(n)){let r=Bn(n);return Lo(r)||Zp(r)}else if(H0(n))i=()=>Bn(n.useValue);else if(iT(n))i=()=>n.useFactory(...Yp(n.deps||[]));else if(nT(n))i=(r,s)=>qe(Bn(n.useExisting),s!==void 0&&s&8?8:void 0);else{let r=Bn(n&&(n.useClass||n.provide));if(oT(n))i=()=>new r(...Yp(n.deps));else return Lo(r)||Zp(r)}return i}function cc(n){if(n.destroyed)throw new Ce(-205,!1)}function Oo(n,e,t=!1){return{factory:n,value:e,multi:t?[]:void 0}}function oT(n){return!!n.deps}function aT(n){return n!==null&&typeof n=="object"&&typeof n.ngOnDestroy=="function"}function cT(n){return typeof n=="function"||typeof n=="object"&&n.ngMetadataName==="InjectionToken"}function Kp(n,e){for(let t of n)Array.isArray(t)?Kp(t,e):t&&cm(t)?Kp(t.\u0275providers,e):e(t)}function hn(n,e){let t;n instanceof ks?(cc(n),t=n):t=new Xp(n);let i,r=Ii(t),s=Un(void 0);try{return e()}finally{Ii(r),Un(s)}}function G0(){return P0()!==void 0||lu()!=null}var hi=0,Le=1,Ge=2,Ft=3,ti=4,On=5,Vo=6,Ho=7,Ot=8,pr=9,Ri=10,Ht=11,zo=12,xm=13,Wr=14,Ln=15,$r=16,zs=17,Ni=18,yc=19,Sm=20,ur=21,Gu=22,Go=23,Vn=24,ju=25,j0=26,_c=27,pn=28,W0=1,Em=6,Gs=7,xc=8,js=9,Lt=10;function qr(n){return Array.isArray(n)&&typeof n[W0]=="object"}function ni(n){return Array.isArray(n)&&n[W0]===!0}function Mm(n){return(n.flags&4)!==0}function Xr(n){return n.componentOffset>-1}function Wu(n){return(n.flags&1)===1}function Ws(n){return!!n.template}function jo(n){return(n[Ge]&512)!==0}function $s(n){return(n[Ge]&256)===256}var bm="svg",$0="math";function mn(n){for(;Array.isArray(n);)n=n[hi];return n}function wm(n,e){return mn(e[n])}function pi(n,e){return mn(e[n.index])}function $u(n,e){return n.data[e]}function Pi(n,e){let t=e[n];return qr(t)?t:t[hi]}function qu(n){return(n[Ge]&128)===128}function q0(n){return ni(n[Ft])}function Oi(n,e){return e==null?null:n[e]}function Cm(n){n[zs]=0}function Tm(n){n[Ge]&1024||(n[Ge]|=1024,qu(n)&&Ec(n))}function X0(n,e){for(;n>0;)e=e[Wr],n--;return e}function Sc(n){return!!(n[Ge]&9216||n[Vn]?.dirty)}function Xu(n){n[Ri].changeDetectionScheduler?.notify(8),n[Ge]&64&&(n[Ge]|=1024),Sc(n)&&Ec(n)}function Ec(n){n[Ri].changeDetectionScheduler?.notify(0);let e=fr(n);for(;e!==null&&!(e[Ge]&8192||(e[Ge]|=8192,!qu(e)));)e=fr(e)}function Yu(n,e){if($s(n))throw new Ce(911,!1);n[ur]===null&&(n[ur]=[]),n[ur].push(e)}function Y0(n,e){if(n[ur]===null)return;let t=n[ur].indexOf(e);t!==-1&&n[ur].splice(t,1)}function fr(n){let e=n[Ft];return ni(e)?e[Ft]:e}function Dm(n){return n[Ho]??=[]}function Im(n){return n.cleanup??=[]}function Z0(n,e,t,i){let r=Dm(e);r.push(t),n.firstCreatePass&&Im(n).push(i,r.length-1)}var Ye={lFrame:fx(null),bindingsEnabled:!0,skipHydrationRootTNode:null};var Jp=!1;function K0(){return Ye.lFrame.elementDepthCount}function J0(){Ye.lFrame.elementDepthCount++}function Am(){Ye.lFrame.elementDepthCount--}function Q0(){return Ye.bindingsEnabled}function ex(){return Ye.skipHydrationRootTNode!==null}function Rm(n){return Ye.skipHydrationRootTNode===n}function Nm(){Ye.skipHydrationRootTNode=null}function dt(){return Ye.lFrame.lView}function ii(){return Ye.lFrame.tView}function Li(n){return Ye.lFrame.contextLView=n,n[Ot]}function Fi(n){return Ye.lFrame.contextLView=null,n}function mi(){let n=Pm();for(;n!==null&&n.type===64;)n=n.parent;return n}function Pm(){return Ye.lFrame.currentTNode}function tx(){let n=Ye.lFrame,e=n.currentTNode;return n.isParent?e:e.parent}function Wo(n,e){let t=Ye.lFrame;t.currentTNode=n,t.isParent=e}function Om(){return Ye.lFrame.isParent}function nx(){Ye.lFrame.isParent=!1}function Lm(){return Jp}function Fm(n){let e=Jp;return Jp=n,e}function ix(){let n=Ye.lFrame,e=n.bindingRootIndex;return e===-1&&(e=n.bindingRootIndex=n.tView.bindingStartIndex),e}function rx(){return Ye.lFrame.bindingIndex}function sx(n){return Ye.lFrame.bindingIndex=n}function $o(){return Ye.lFrame.bindingIndex++}function km(n){let e=Ye.lFrame,t=e.bindingIndex;return e.bindingIndex=e.bindingIndex+n,t}function ox(){return Ye.lFrame.inI18n}function ax(n,e){let t=Ye.lFrame;t.bindingIndex=t.bindingRootIndex=n,Zu(e)}function cx(){return Ye.lFrame.currentDirectiveIndex}function Zu(n){Ye.lFrame.currentDirectiveIndex=n}function lx(n){let e=Ye.lFrame.currentDirectiveIndex;return e===-1?null:n[e]}function ux(){return Ye.lFrame.currentQueryIndex}function Ku(n){Ye.lFrame.currentQueryIndex=n}function lT(n){let e=n[Le];return e.type===2?e.declTNode:e.type===1?n[On]:null}function Um(n,e,t){if(t&4){let r=e,s=n;for(;r=r.parent,r===null&&!(t&1);)if(r=lT(s),r===null||(s=s[Wr],r.type&10))break;if(r===null)return!1;e=r,n=s}let i=Ye.lFrame=dx();return i.currentTNode=e,i.lView=n,!0}function Ju(n){let e=dx(),t=n[Le];Ye.lFrame=e,e.currentTNode=t.firstChild,e.lView=n,e.tView=t,e.contextLView=n,e.bindingIndex=t.bindingStartIndex,e.inI18n=!1}function dx(){let n=Ye.lFrame,e=n===null?null:n.child;return e===null?fx(n):e}function fx(n){let e={currentTNode:null,isParent:!0,lView:null,tView:null,selectedIndex:-1,contextLView:null,elementDepthCount:0,currentNamespace:null,currentDirectiveIndex:-1,bindingRootIndex:-1,bindingIndex:-1,currentQueryIndex:0,parent:n,child:null,inI18n:!1};return n!==null&&(n.child=e),e}function hx(){let n=Ye.lFrame;return Ye.lFrame=n.parent,n.currentTNode=null,n.lView=null,n}var Bm=hx;function Qu(){let n=hx();n.isParent=!0,n.tView=null,n.selectedIndex=-1,n.contextLView=null,n.elementDepthCount=0,n.currentDirectiveIndex=-1,n.currentNamespace=null,n.bindingRootIndex=-1,n.bindingIndex=-1,n.currentQueryIndex=0}function px(n){return(Ye.lFrame.contextLView=X0(n,Ye.lFrame.contextLView))[Ot]}function mr(){return Ye.lFrame.selectedIndex}function Yr(n){Ye.lFrame.selectedIndex=n}function Vm(){let n=Ye.lFrame;return $u(n.tView,n.selectedIndex)}function gr(){Ye.lFrame.currentNamespace=bm}function vr(){uT()}function uT(){Ye.lFrame.currentNamespace=null}function Hm(){return Ye.lFrame.currentNamespace}var mx=!0;function ed(){return mx}function td(n){mx=n}function Qp(n,e=null,t=null,i){let r=zm(n,e,t,i);return r.resolveInjectorInitializers(),r}function zm(n,e=null,t=null,i,r=new Set){let s=[t||dr,B0(n)],o;return new ks(s,e||vc(),o||null,r)}var fi=class n{static THROW_IF_NOT_FOUND=Ls;static NULL=new Fo;static create(e,t){if(Array.isArray(e))return Qp({name:""},t,e,"");{let i=e.name??"";return Qp({name:i},e.parent,e.providers,i)}}static \u0275prov=ut({token:n,providedIn:"any",factory:()=>qe(gm)});static __NG_ELEMENT_ID__=-1},zt=new Pe(""),Ai=class{static __NG_ELEMENT_ID__=dT;static __NG_ENV_ID__=e=>e},em=class extends Ai{_lView;constructor(e){super(),this._lView=e}get destroyed(){return $s(this._lView)}onDestroy(e){let t=this._lView;return Yu(t,e),()=>Y0(t,e)}};function dT(){return new em(dt())}var gx=!1,vx=new Pe(""),Zr=(()=>{class n{taskId=0;pendingTasks=new Set;destroyed=!1;pendingTask=new dn(!1);debugTaskTracker=re(vx,{optional:!0});get hasPendingTasks(){return this.destroyed?!1:this.pendingTask.value}get hasPendingTasksObservable(){return this.destroyed?new st(t=>{t.next(!1),t.complete()}):this.pendingTask}add(){!this.hasPendingTasks&&!this.destroyed&&this.pendingTask.next(!0);let t=this.taskId++;return this.pendingTasks.add(t),this.debugTaskTracker?.add(t),t}has(t){return this.pendingTasks.has(t)}remove(t){this.pendingTasks.delete(t),this.debugTaskTracker?.remove(t),this.pendingTasks.size===0&&this.hasPendingTasks&&this.pendingTask.next(!1)}ngOnDestroy(){this.pendingTasks.clear(),this.hasPendingTasks&&this.pendingTask.next(!1),this.destroyed=!0,this.pendingTask.unsubscribe()}static \u0275prov=ut({token:n,providedIn:"root",factory:()=>new n})}return n})(),tm=class extends Bt{__isAsync;destroyRef=void 0;pendingTasks=void 0;constructor(e=!1){super(),this.__isAsync=e,G0()&&(this.destroyRef=re(Ai,{optional:!0})??void 0,this.pendingTasks=re(Zr,{optional:!0})??void 0)}emit(e){let t=De(null);try{super.next(e)}finally{De(t)}}subscribe(e,t,i){let r=e,s=t||(()=>null),o=i;if(e&&typeof e=="object"){let c=e;r=c.next?.bind(c),s=c.error?.bind(c),o=c.complete?.bind(c)}this.__isAsync&&(s=this.wrapInTimeout(s),r&&(r=this.wrapInTimeout(r)),o&&(o=this.wrapInTimeout(o)));let a=super.subscribe({next:r,error:s,complete:o});return e instanceof un&&e.add(a),a}wrapInTimeout(e){return t=>{let i=this.pendingTasks?.add();setTimeout(()=>{try{e(t)}finally{i!==void 0&&this.pendingTasks?.remove(i)}})}}},Cn=tm;function Lu(...n){}function Gm(n){let e,t;function i(){n=Lu;try{t!==void 0&&typeof cancelAnimationFrame=="function"&&cancelAnimationFrame(t),e!==void 0&&clearTimeout(e)}catch{}}return e=setTimeout(()=>{n(),i()}),typeof requestAnimationFrame=="function"&&(t=requestAnimationFrame(()=>{n(),i()})),()=>i()}function yx(n){return queueMicrotask(()=>n()),()=>{n=Lu}}var jm="isAngularZone",lc=jm+"_ID",fT=0,Pn=class n{hasPendingMacrotasks=!1;hasPendingMicrotasks=!1;isStable=!0;onUnstable=new Cn(!1);onMicrotaskEmpty=new Cn(!1);onStable=new Cn(!1);onError=new Cn(!1);constructor(e){let{enableLongStackTrace:t=!1,shouldCoalesceEventChangeDetection:i=!1,shouldCoalesceRunChangeDetection:r=!1,scheduleInRootZone:s=gx}=e;if(typeof Zone>"u")throw new Ce(908,!1);Zone.assertZonePatched();let o=this;o._nesting=0,o._outer=o._inner=Zone.current,Zone.TaskTrackingZoneSpec&&(o._inner=o._inner.fork(new Zone.TaskTrackingZoneSpec)),t&&Zone.longStackTraceZoneSpec&&(o._inner=o._inner.fork(Zone.longStackTraceZoneSpec)),o.shouldCoalesceEventChangeDetection=!r&&i,o.shouldCoalesceRunChangeDetection=r,o.callbackScheduled=!1,o.scheduleInRootZone=s,mT(o)}static isInAngularZone(){return typeof Zone<"u"&&Zone.current.get(jm)===!0}static assertInAngularZone(){if(!n.isInAngularZone())throw new Ce(909,!1)}static assertNotInAngularZone(){if(n.isInAngularZone())throw new Ce(909,!1)}run(e,t,i){return this._inner.run(e,t,i)}runTask(e,t,i,r){let s=this._inner,o=s.scheduleEventTask("NgZoneEvent: "+r,e,hT,Lu,Lu);try{return s.runTask(o,t,i)}finally{s.cancelTask(o)}}runGuarded(e,t,i){return this._inner.runGuarded(e,t,i)}runOutsideAngular(e){return this._outer.run(e)}},hT={};function Wm(n){if(n._nesting==0&&!n.hasPendingMicrotasks&&!n.isStable)try{n._nesting++,n.onMicrotaskEmpty.emit(null)}finally{if(n._nesting--,!n.hasPendingMicrotasks)try{n.runOutsideAngular(()=>n.onStable.emit(null))}finally{n.isStable=!0}}}function pT(n){if(n.isCheckStableRunning||n.callbackScheduled)return;n.callbackScheduled=!0;function e(){Gm(()=>{n.callbackScheduled=!1,nm(n),n.isCheckStableRunning=!0,Wm(n),n.isCheckStableRunning=!1})}n.scheduleInRootZone?Zone.root.run(()=>{e()}):n._outer.run(()=>{e()}),nm(n)}function mT(n){let e=()=>{pT(n)},t=fT++;n._inner=n._inner.fork({name:"angular",properties:{[jm]:!0,[lc]:t,[lc+t]:!0},onInvokeTask:(i,r,s,o,a,c)=>{if(gT(c))return i.invokeTask(s,o,a,c);try{return C0(n),i.invokeTask(s,o,a,c)}finally{(n.shouldCoalesceEventChangeDetection&&o.type==="eventTask"||n.shouldCoalesceRunChangeDetection)&&e(),T0(n)}},onInvoke:(i,r,s,o,a,c,l)=>{try{return C0(n),i.invoke(s,o,a,c,l)}finally{n.shouldCoalesceRunChangeDetection&&!n.callbackScheduled&&!vT(c)&&e(),T0(n)}},onHasTask:(i,r,s,o)=>{i.hasTask(s,o),r===s&&(o.change=="microTask"?(n._hasPendingMicrotasks=o.microTask,nm(n),Wm(n)):o.change=="macroTask"&&(n.hasPendingMacrotasks=o.macroTask))},onHandleError:(i,r,s,o)=>(i.handleError(s,o),n.runOutsideAngular(()=>n.onError.emit(o)),!1)})}function nm(n){n._hasPendingMicrotasks||(n.shouldCoalesceEventChangeDetection||n.shouldCoalesceRunChangeDetection)&&n.callbackScheduled===!0?n.hasPendingMicrotasks=!0:n.hasPendingMicrotasks=!1}function C0(n){n._nesting++,n.isStable&&(n.isStable=!1,n.onUnstable.emit(null))}function T0(n){n._nesting--,Wm(n)}var uc=class{hasPendingMicrotasks=!1;hasPendingMacrotasks=!1;isStable=!0;onUnstable=new Cn;onMicrotaskEmpty=new Cn;onStable=new Cn;onError=new Cn;run(e,t,i){return e.apply(t,i)}runGuarded(e,t,i){return e.apply(t,i)}runOutsideAngular(e){return e()}runTask(e,t,i,r){return e.apply(t,i)}};function gT(n){return _x(n,"__ignore_ng_zone__")}function vT(n){return _x(n,"__scheduler_tick__")}function _x(n,e){return!Array.isArray(n)||n.length!==1?!1:n[0]?.data?.[e]===!0}var hr=class{_console=console;handleError(e){this._console.error("ERROR",e)}};function xx(n){return yT(n)?n:new im(n)}function yT(n){return n instanceof Error||typeof n=="object"&&n!==null&&typeof n.name=="string"&&typeof n.message=="string"}var im=class extends Error{constructor(e){super(String(e),{cause:e}),this.name="ErrorBoundaryWrappedError"}},ki=new Pe("",{factory:()=>{let n=re(Pn),e=re(nn),t;return i=>{n.runOutsideAngular(()=>{e.destroyed&&!t?setTimeout(()=>{throw i}):(t??=e.get(hr),t.handleError(i))})}}}),Sx={provide:Bo,useValue:()=>{let n=re(hr,{optional:!0})},multi:!0},_T=new Pe("",{factory:()=>{let n=re(zt).defaultView;if(!n)return;let e=re(ki),t=s=>{e(s.reason),s.preventDefault()},i=s=>{s.error?e(s.error):e(new Error(s.message,{cause:s})),s.preventDefault()},r=()=>{n.addEventListener("unhandledrejection",t),n.addEventListener("error",i)};typeof Zone<"u"?Zone.root.run(r):r(),re(Ai).onDestroy(()=>{n.removeEventListener("error",i),n.removeEventListener("unhandledrejection",t)})}});function $m(){return Hs([U0(()=>{re(_T)})])}function Xt(n,e){let[t,i,r]=Ap(n,e?.equal),s=t,o=s[ln];return s.set=i,s.update=r,s.asReadonly=Ex.bind(s),s}function Ex(){let n=this[ln];if(n.readonlyFn===void 0){let e=()=>this();e[ln]=n,n.readonlyFn=e}return n.readonlyFn}var Mc=new Pe("",{factory:()=>xT}),xT="ng";var nd=new Pe(""),bc=new Pe("",{providedIn:"platform",factory:()=>"unknown"});var id=new Pe("",{factory:()=>re(zt).body?.querySelector("[ngCspNonce]")?.getAttribute("ngCspNonce")||null});var ko=class{},wc=new Pe("",{factory:()=>!0});var qm=new Pe(""),Xm=(()=>{class n{static \u0275prov=ut({token:n,providedIn:"root",factory:()=>new rm})}return n})(),rm=class{dirtyEffectCount=0;queues=new Map;add(e){this.enqueue(e),this.schedule(e)}schedule(e){e.dirty&&this.dirtyEffectCount++}remove(e){let t=e.zone,i=this.queues.get(t);i.has(e)&&(i.delete(e),e.dirty&&this.dirtyEffectCount--)}enqueue(e){let t=e.zone;this.queues.has(t)||this.queues.set(t,new Set);let i=this.queues.get(t);i.has(e)||i.add(e)}flush(){for(;this.dirtyEffectCount>0;){let e=!1;for(let[t,i]of this.queues)t===null?e||=this.flushQueue(i):e||=t.run(()=>this.flushQueue(i));e||(this.dirtyEffectCount=0)}}flushQueue(e){let t=!1;for(let i of e)i.dirty&&(this.dirtyEffectCount--,t=!0,i.run());return t}},sm=class{[ln];constructor(e){this[ln]=e}destroy(){this[ln].destroy()}};var Rg=Symbol("InputSignalNode#UNSET"),eS=_t(he({},ic),{transformFn:void 0,applyValueToInputSignal(n,e){As(n,e)}});function Ng(n){return{toString:n}.toString()}var ft=(function(n){return n[n.TemplateCreateStart=0]="TemplateCreateStart",n[n.TemplateCreateEnd=1]="TemplateCreateEnd",n[n.TemplateUpdateStart=2]="TemplateUpdateStart",n[n.TemplateUpdateEnd=3]="TemplateUpdateEnd",n[n.LifecycleHookStart=4]="LifecycleHookStart",n[n.LifecycleHookEnd=5]="LifecycleHookEnd",n[n.OutputStart=6]="OutputStart",n[n.OutputEnd=7]="OutputEnd",n[n.BootstrapApplicationStart=8]="BootstrapApplicationStart",n[n.BootstrapApplicationEnd=9]="BootstrapApplicationEnd",n[n.BootstrapComponentStart=10]="BootstrapComponentStart",n[n.BootstrapComponentEnd=11]="BootstrapComponentEnd",n[n.ChangeDetectionStart=12]="ChangeDetectionStart",n[n.ChangeDetectionEnd=13]="ChangeDetectionEnd",n[n.ChangeDetectionSyncStart=14]="ChangeDetectionSyncStart",n[n.ChangeDetectionSyncEnd=15]="ChangeDetectionSyncEnd",n[n.AfterRenderHooksStart=16]="AfterRenderHooksStart",n[n.AfterRenderHooksEnd=17]="AfterRenderHooksEnd",n[n.ComponentStart=18]="ComponentStart",n[n.ComponentEnd=19]="ComponentEnd",n[n.DeferBlockStateStart=20]="DeferBlockStateStart",n[n.DeferBlockStateEnd=21]="DeferBlockStateEnd",n[n.DynamicComponentStart=22]="DynamicComponentStart",n[n.DynamicComponentEnd=23]="DynamicComponentEnd",n[n.HostBindingsUpdateStart=24]="HostBindingsUpdateStart",n[n.HostBindingsUpdateEnd=25]="HostBindingsUpdateEnd",n})(ft||{}),ld=class{previousValue;currentValue;firstChange;constructor(e,t,i){this.previousValue=e,this.currentValue=t,this.firstChange=i}isFirstChange(){return this.firstChange}};function tS(n,e,t,i){e!==null?e.applyValueToInputSignal(e,i):n[t]=i}var nS=null,wd=(()=>{nS=Mx;let n=()=>Mx;return n.ngInherit=!0,n})();function kT(){return nS}function Mx(n){return n.type.prototype.ngOnChanges&&(n.setInput=BT),UT}function UT(){let n=iS(this),e=n?.current;if(e){let t=n.previous;if(t===Vs)n.previous=e;else for(let i in e)t[i]=e[i];n.current=null,this.ngOnChanges(e)}}function BT(n,e,t,i,r){let s=this.declaredInputs[i],o=iS(n)||VT(n,{previous:Vs,current:null}),a=o.current||(o.current={}),c=o.previous,l=c[s];a[s]=new ld(l&&l.currentValue,t,c===Vs),tS(n,e,r,t)}var ng="__ngSimpleChanges__";function iS(n){return Object.hasOwn(n,ng)&&n[ng]||null}function VT(n,e){return n[ng]=e}var bx=[];var St=function(n,e=null,t){for(let i=0;i<bx.length;i++){let r=bx[i];r(n,e,t)}};function HT(n,e,t){let{ngOnChanges:i,ngOnInit:r,ngDoCheck:s}=e.type.prototype;if(i){let o=kT()(e);(t.preOrderHooks??=[]).push(n,o),(t.preOrderCheckHooks??=[]).push(n,o)}r&&(t.preOrderHooks??=[]).push(0-n,r),s&&((t.preOrderHooks??=[]).push(n,s),(t.preOrderCheckHooks??=[]).push(n,s))}function zT(n,e){for(let t=e.directiveStart,i=e.directiveEnd;t<i;t++){let s=n.data[t].type.prototype,{ngAfterContentInit:o,ngAfterContentChecked:a,ngAfterViewInit:c,ngAfterViewChecked:l,ngOnDestroy:u}=s;o&&(n.contentHooks??=[]).push(-t,o),a&&((n.contentHooks??=[]).push(t,a),(n.contentCheckHooks??=[]).push(t,a)),c&&(n.viewHooks??=[]).push(-t,c),l&&((n.viewHooks??=[]).push(t,l),(n.viewCheckHooks??=[]).push(t,l)),u!=null&&(n.destroyHooks??=[]).push(t,u)}}function sd(n,e,t){rS(n,e,3,t)}function od(n,e,t,i){(n[Ge]&3)===t&&rS(n,e,t,i)}function Ym(n,e){let t=n[Ge];(t&3)===e&&(t&=16383,t+=1,n[Ge]=t)}function rS(n,e,t,i){let r=i!==void 0?n[zs]&65535:0,s=i??-1,o=e.length-1,a=0;for(let c=r;c<o;c++)if(typeof e[c+1]=="number"){if(a=e[c],i!=null&&a>=i)break}else e[c]<0&&(n[zs]+=65536),(a<s||s==-1)&&(GT(n,t,e,c),n[zs]=(n[zs]&4294901760)+c+2),c++}function wx(n,e){St(ft.LifecycleHookStart,n,e);let t=De(null);try{e.call(n)}finally{De(t),St(ft.LifecycleHookEnd,n,e)}}function GT(n,e,t,i){let r=t[i]<0,s=t[i+1],o=r?-t[i]:t[i],a=n[o];r?n[Ge]>>14<n[zs]>>16&&(n[Ge]&3)===e&&(n[Ge]+=16384,wx(a,s)):wx(a,s)}var Yo=-1,Dc=class{factory;name;injectImpl;resolving=!1;canSeeViewProviders;multi;componentProviders;index;providerFactory;constructor(e,t,i,r){this.factory=e,this.name=r,this.canSeeViewProviders=t,this.injectImpl=i}};function jT(n){return(n.flags&8)!==0}function WT(n){return(n.flags&16)!==0}function $T(n,e,t){let i=0;for(;i<t.length;){let r=t[i];if(typeof r=="number"){if(r!==0)break;i++;let s=t[i++],o=t[i++],a=t[i++];n.setAttribute(e,o,a,s)}else{let s=r,o=t[++i];XT(s)?n.setProperty(e,s,o):n.setAttribute(e,s,o),i++}}return i}function qT(n){return n===3||n===4||n===6}function XT(n){return n.charCodeAt(0)===64}function Cd(n,e){if(!(e===null||e.length===0))if(n===null||n.length===0)n=e.slice();else{let t=-1;for(let i=0;i<e.length;i++){let r=e[i];typeof r=="number"?t=r:t===0||(t===-1||t===2?Cx(n,t,r,null,e[++i]):Cx(n,t,r,null,null))}}return n}function Cx(n,e,t,i,r){let s=0,o=n.length;if(e===-1)o=-1;else for(;s<n.length;){let a=n[s++];if(typeof a=="number"){if(a===e){o=-1;break}else if(a>e){o=s-1;break}}}for(;s<n.length;){let a=n[s];if(typeof a=="number")break;if(a===t){r!==null&&(n[s+1]=r);return}s++,r!==null&&s++}o!==-1&&(n.splice(o,0,e),s=o+1),n.splice(s++,0,t),r!==null&&n.splice(s++,0,r)}function sS(n){return n!==Yo}function ud(n){return n&32767}function YT(n){return n>>16}function dd(n,e){let t=YT(n),i=e;for(;t>0;)i=i[Wr],t--;return i}var ig=!0;function Tx(n){let e=ig;return ig=n,e}var ZT=256,oS=ZT-1,aS=5,KT=0,Ui={};function JT(n,e,t){let i;typeof t=="string"?i=t.charCodeAt(0)||0:Object.hasOwn(t,Us)&&(i=t[Us]),i==null&&(i=t[Us]=KT++);let r=i&oS,s=1<<r;e.data[n+(r>>aS)]|=s}function cS(n,e){let t=lS(n,e);if(t!==-1)return t;let i=e[Le];i.firstCreatePass&&(n.injectorIndex=e.length,Zm(i.data,n),Zm(e,null),Zm(i.blueprint,null));let r=Pg(n,e),s=n.injectorIndex;if(sS(r)){let o=ud(r),a=dd(r,e),c=a[Le].data;for(let l=0;l<8;l++)e[s+l]=a[o+l]|c[o+l]}return e[s+8]=r,s}function Zm(n,e){n.push(0,0,0,0,0,0,0,0,e)}function lS(n,e){return n.injectorIndex===-1||n.parent&&n.parent.injectorIndex===n.injectorIndex||e[n.injectorIndex+8]===null?-1:n.injectorIndex}function Pg(n,e){if(n.parent&&n.parent.injectorIndex!==-1)return n.parent.injectorIndex;let t=0,i=null,r=e;for(;r!==null;){if(i=pS(r),i===null)return Yo;if(t++,r=r[Wr],i.injectorIndex!==-1)return i.injectorIndex|t<<16}return Yo}function QT(n,e,t){JT(n,e,t)}function uS(n,e,t){if(t&8||n!==void 0)return n;Vu(e,"NodeInjector")}function dS(n,e,t,i){if(t&8&&i===void 0&&(i=null),(t&3)===0){let r=n[pr],s=Un(void 0);try{return r?r.get(e,i,t&8):pm(e,i,t&8)}finally{Un(s)}}return uS(i,e,t)}function fS(n,e,t,i=0,r){if(n!==null){if(e[Ge]&2048&&!(i&2)){let o=iD(n,e,t,i,Ui);if(o!==Ui)return o}let s=hS(n,e,t,i,Ui);if(s!==Ui)return s}return dS(e,t,i,r)}function hS(n,e,t,i,r){let s=tD(t);if(typeof s=="function"){if(!Um(e,n,i))return i&1?uS(r,t,i):dS(e,t,i,r);try{let o;if(o=s(i),o==null&&!(i&8))Vu(t);else return o}finally{Bm()}}else if(typeof s=="number"){let o=null,a=lS(n,e),c=Yo,l=i&1?e[Ln][On]:null;for((a===-1||i&4)&&(c=a===-1?Pg(n,e):e[a+8],c===Yo||!Ix(i,!1)?a=-1:(o=e[Le],a=ud(c),e=dd(c,e)));a!==-1;){let u=e[Le];if(Dx(s,a,u.data)){let d=eD(a,e,t,o,i,l);if(d!==Ui)return d}c=e[a+8],c!==Yo&&Ix(i,e[Le].data[a+8]===l)&&Dx(s,a,e)?(o=u,a=ud(c),e=dd(c,e)):a=-1}}return r}function eD(n,e,t,i,r,s){let o=e[Le],a=o.data[n+8],c=i==null?Xr(a)&&ig:i!=o&&(a.type&3)!==0,l=r&1&&s===a,u=ad(a,o,t,c,l);return u!==null?fd(e,o,u,a,r):Ui}function ad(n,e,t,i,r){let s=n.providerIndexes,o=e.data,a=s&1048575,c=n.directiveStart,l=n.directiveEnd,u=s>>20,d=i?a:a+u,f=r?a+u:l;for(let h=d;h<f;h++){let g=o[h];if(h<c&&t===g||h>=c&&g.type===t)return h}if(r){let h=o[c];if(h&&Ws(h)&&h.type===t)return c}return null}function fd(n,e,t,i,r){let s=n[t],o=e.data;if(s instanceof Dc){let a=s;if(a.resolving)throw hm("");let c=Tx(a.canSeeViewProviders);a.resolving=!0;let l=o[t].type||o[t],u,d=a.injectImpl?Un(a.injectImpl):null,f=Um(n,i,0);try{s=n[t]=a.factory(void 0,r,o,n,i),e.firstCreatePass&&t>=i.directiveStart&&HT(t,o[t],e)}finally{d!==null&&Un(d),Tx(c),a.resolving=!1,Bm()}}return s}function tD(n){if(typeof n=="string")return n.charCodeAt(0)||0;let e=Object.hasOwn(n,Us)?n[Us]:void 0;return typeof e=="number"?e>=0?e&oS:nD:e}function Dx(n,e,t){let i=1<<n;return!!(t[e+(n>>aS)]&i)}function Ix(n,e){return!(n&2)&&!(n&1&&e)}var yr=class{_tNode;_lView;constructor(e,t){this._tNode=e,this._lView=t}get(e,t,i){return fS(this._tNode,this._lView,e,Fs(i),t)}};function nD(){return new yr(mi(),dt())}function iD(n,e,t,i,r){let s=n,o=e;for(;s!==null&&o!==null&&o[Ge]&2048&&!jo(o);){let a=hS(s,o,t,i|2,Ui);if(a!==Ui)return a;i&=-5;let c=s.parent;if(!c){let l=o[Sm];if(l){let u=l.get(t,Ui,i);if(u!==Ui)return u}c=pS(o),o=o[Wr]}s=c}return r}function pS(n){let e=n[Le],t=e.type;return t===2?e.declTNode:t===1?n[On]:null}function Yt(n){return{token:n.token,providedIn:n.autoProvided===!1?null:"root",factory:n.factory,value:void 0}}function rD(){return ea(mi(),dt())}function ea(n,e){return new ta(pi(n,e))}var ta=(()=>{class n{nativeElement;constructor(t){this.nativeElement=t}static __NG_ELEMENT_ID__=rD}return n})();function sD(n){return n instanceof ta?n.nativeElement:n}function oD(){return this._results[Symbol.iterator]()}var hd=class{_emitDistinctChangesOnly;dirty=!0;_onDirty=void 0;_results=[];_changesDetected=!1;_changes=void 0;length=0;first=void 0;last=void 0;get changes(){return this._changes??=new Bt}constructor(e=!1){this._emitDistinctChangesOnly=e}get(e){return this._results[e]}map(e){return this._results.map(e)}filter(e){return this._results.filter(e)}find(e){return this._results.find(e)}reduce(e,t){return this._results.reduce(e,t)}forEach(e){this._results.forEach(e)}some(e){return this._results.some(e)}toArray(){return this._results.slice()}toString(){return this._results.toString()}reset(e,t){this.dirty=!1;let i=L0(e);(this._changesDetected=!O0(this._results,i,t))&&(this._results=i,this.length=i.length,this.last=i[this.length-1],this.first=i[0])}notifyOnChanges(){this._changes!==void 0&&(this._changesDetected||!this._emitDistinctChangesOnly)&&this._changes.next(this)}onDirty(e){this._onDirty=e}setDirty(){this.dirty=!0,this._onDirty?.()}destroy(){this._changes!==void 0&&(this._changes.complete(),this._changes.unsubscribe())}[Symbol.iterator]=oD};function mS(n){return(n.flags&128)===128}var Og=(function(n){return n[n.OnPush=0]="OnPush",n[n.Eager=1]="Eager",n[n.Default=1]="Default",n})(Og||{}),gS=new Map,aD=0;function cD(){return aD++}function lD(n){gS.set(n[yc],n)}function rg(n){gS.delete(n[yc])}var Ax="__ngContext__";function Zo(n,e){qr(e)?(n[Ax]=e[yc],lD(e)):n[Ax]=e}function vS(n){return _S(n[zo])}function yS(n){return _S(n[ti])}function _S(n){for(;n!==null&&!ni(n);)n=n[ti];return n}var sg;function Lg(n){sg=n}function xS(){if(sg!==void 0)return sg;if(typeof document<"u")return document;throw new Ce(210,!1)}var SS="r";var ES="di";var MS=!1,bS=new Pe("",{factory:()=>MS});var Rx=new WeakMap;function uD(n,e){if(n==null||typeof n!="object")return;let t=Rx.get(n);t||(t=new WeakSet,Rx.set(n,t)),t.add(e)}var dD=(n,e,t,i)=>{};function fD(n,e,t,i){dD(n,e,t,i)}function Fg(n){return(n.flags&32)===32}var hD=()=>null;function wS(n,e,t=!1){return hD(n,e,t)}function CS(n,e){let t=n.contentQueries;if(t!==null){let i=De(null);try{for(let r=0;r<t.length;r+=2){let s=t[r],o=t[r+1];if(o!==-1){let a=n.data[o];Ku(s),a.contentQueries(2,e[o],o)}}}finally{De(i)}}}function og(n,e,t){Ku(0);let i=De(null);try{e(n,t)}finally{De(i)}}function TS(n,e,t){if(Mm(e)){let i=De(null);try{let r=e.directiveStart,s=e.directiveEnd;for(let o=r;o<s;o++){let a=n.data[o];if(a.contentQueries){let c=t[o];a.contentQueries(1,c,o)}}}finally{De(i)}}}var vi=(function(n){return n[n.Emulated=0]="Emulated",n[n.None=2]="None",n[n.ShadowDom=3]="ShadowDom",n[n.ExperimentalIsolatedShadowDom=4]="ExperimentalIsolatedShadowDom",n})(vi||{}),ag=class{changingThisBreaksApplicationSecurity;constructor(e){this.changingThisBreaksApplicationSecurity=e}toString(){return`SafeValue must use [property]=binding: ${this.changingThisBreaksApplicationSecurity}`}};function pd(n){return n instanceof ag?n.changingThisBreaksApplicationSecurity:n}function pD(n,e){return n.createText(e)}function mD(n,e,t){n.setValue(e,t)}function DS(n,e,t){return n.createElement(e,t)}function qs(n,e,t,i,r){n.insertBefore(e,t,i,r)}function IS(n,e,t){n.appendChild(e,t)}function Nx(n,e,t,i,r){i!==null?qs(n,e,t,i,r):IS(n,e,t)}function AS(n,e,t,i){n.removeChild(null,e,t,i)}function gD(n,e,t){n.setAttribute(e,"style",t)}function vD(n,e,t){t===""?n.removeAttribute(e,"class"):n.setAttribute(e,"class",t)}function RS(n,e,t){let{mergedAttrs:i,classes:r,styles:s}=t;i!==null&&$T(n,e,i),r!==null&&vD(n,e,r),s!==null&&gD(n,e,s)}function yD(n){return n instanceof Function?n():n}function _D(n,e,t){let i=n.length;for(;;){let r=n.indexOf(e,t);if(r===-1)return r;if(r===0||n.charCodeAt(r-1)<=32){let s=e.length;if(r+s===i||n.charCodeAt(r+s)<=32)return r}t=r+1}}var NS="ng-template";function xD(n,e,t,i){let r=0;if(i){for(;r<e.length&&typeof e[r]=="string";r+=2)if(e[r]==="class"&&_D(e[r+1].toLowerCase(),t,0)!==-1)return!0}else if(kg(n))return!1;if(r=e.indexOf(1,r),r>-1){let s;for(;++r<e.length&&typeof(s=e[r])=="string";)if(s.toLowerCase()===t)return!0}return!1}function kg(n){return n.type===4&&n.value!==NS}function SD(n,e,t){let i=n.type===4&&!t?NS:n.value;return e===i}function ED(n,e,t){let i=4,r=n.attrs,s=r!==null?wD(r):0,o=!1;for(let a=0;a<e.length;a++){let c=e[a];if(typeof c=="number"){if(!o&&!gi(i)&&!gi(c))return!1;if(o&&gi(c))continue;o=!1,i=c|i&1;continue}if(!o)if(i&4){if(i=2|i&1,c!==""&&!SD(n,c,t)||c===""&&e.length===1){if(gi(i))return!1;o=!0}}else if(i&8){if(r===null||!xD(n,r,c,t)){if(gi(i))return!1;o=!0}}else{let l=e[++a],u=MD(c,r,kg(n),t);if(u===-1){if(gi(i))return!1;o=!0;continue}if(l!==""){let d;if(u>s?d="":d=r[u+1].toLowerCase(),i&2&&l!==d){if(gi(i))return!1;o=!0}}}}return gi(i)||o}function gi(n){return(n&1)===0}function MD(n,e,t,i){if(e===null)return-1;let r=0;if(i||!t){let s=!1;for(;r<e.length;){let o=e[r];if(o===n)return r;if(o===3||o===6)s=!0;else if(o===1||o===2){let a=e[++r];for(;typeof a=="string";)a=e[++r];continue}else{if(o===4)break;if(o===0){r+=4;continue}}r+=s?1:2}return-1}else return CD(e,n)}function bD(n,e,t=!1){for(let i=0;i<e.length;i++)if(ED(n,e[i],t))return!0;return!1}function wD(n){for(let e=0;e<n.length;e++){let t=n[e];if(qT(t))return e}return n.length}function CD(n,e){let t=n.indexOf(4);if(t>-1)for(t++;t<n.length;){let i=n[t];if(typeof i=="number")return-1;if(i===e)return t;t++}return-1}function Px(n,e){return n?":not("+e.trim()+")":e}function TD(n){let e=n[0],t=1,i=2,r="",s=!1;for(;t<n.length;){let o=n[t];if(typeof o=="string")if(i&2){let a=n[++t];r+="["+o+(a.length>0?'="'+a+'"':"")+"]"}else i&8?r+="."+o:i&4&&(r+=" "+o);else r!==""&&!gi(o)&&(e+=Px(s,r),r=""),i=o,s=s||!gi(i);t++}return r!==""&&(e+=Px(s,r)),e}function DD(n){return n.map(TD).join(",")}function ID(n){let e=[],t=[],i=1,r=2;for(;i<n.length;){let s=n[i];if(typeof s=="string")r===2?s!==""&&e.push(s,n[++i]):r===8&&t.push(s);else{if(!gi(r))break;r=s}i++}return t.length&&e.push(1,...t),e}var ri={},_r=(function(n){return n[n.Important=1]="Important",n[n.DashCase=2]="DashCase",n})(_r||{}),AD;function Ug(n,e){return AD(n,e)}var Bg=new Set;var n4=typeof document<"u"&&typeof document?.documentElement?.getAnimations=="function";var cg=new WeakMap;function PS(n){return n?n[Wr]??n:null}var qo=new WeakSet;function RD(n,e,t){let i=cg.get(n);if(!i||i.length===0)return;let r=e.parentNode,s=e.previousSibling,o=PS(t);for(let a=i.length-1;a>=0;a--){let{el:c,declarationView:l}=i[a],u=c.parentNode;c===e?(i.splice(a,1),qo.add(c),c.dispatchEvent(new CustomEvent("animationend",{detail:{cancel:!0}}))):s&&c===s?(i.splice(a,1),c.dispatchEvent(new CustomEvent("animationend",{detail:{cancel:!0}})),c.parentNode?.removeChild(c)):u&&r&&u!==r&&(o===null||l===null||o===l)&&(i.splice(a,1),c.dispatchEvent(new CustomEvent("animationend",{detail:{cancel:!0}})),c.parentNode?.removeChild(c))}}function ND(n,e,t){let i=PS(t),r=cg.get(n);r?r.some(s=>s.el===e)||r.push({el:e,declarationView:i}):cg.set(n,[{el:e,declarationView:i}])}var Vg=(function(n){return n[n.CHANGE_DETECTION=0]="CHANGE_DETECTION",n[n.AFTER_NEXT_RENDER=1]="AFTER_NEXT_RENDER",n})(Vg||{}),Zs=new Pe(""),Ox=new Set;function Ks(n){Ox.has(n)||(Ox.add(n),performance?.mark?.("mark_feature_usage",{detail:{feature:n}}))}var OS=(()=>{class n{impl=null;execute(){this.impl?.execute()}static \u0275prov=ut({token:n,providedIn:"root",factory:()=>new n})}return n})();var lg=null,LS=null;function Lx(n,e,t,i){lg?.maybeQueueEnterAnimation(n,e,t,i)}function Fx(n,e,t,i){lg===null?i(!1):lg.runLeaveAnimationsWithCallback(n,e,t,i)}function PD(n){LS?.initViewDetachAnimations(n)}function OD(n){LS?.clearViewDetachAnimations(n)}function Xo(n,e,t,i,r,s,o,a){if(r!=null){let c,l=!1;ni(r)?c=r:qr(r)&&(l=!0,r=r[hi]);let u=mn(r);n===0&&i!==null?(Lx(a,i,s,t),o==null?IS(e,i,u):qs(e,i,u,o||null,!0)):n===1&&i!==null?(qs(e,i,u,o||null,!0),RD(s,u,a),qo.has(u)||Lx(a,i,s,t)):n===2?(a?.[j0]?.leave?.has(s.index)&&ND(s,u,a),qo.delete(u),Fx(a,s,t,d=>{if(qo.has(u)){qo.delete(u);return}AS(e,u,l,d)})):n===3&&(qo.delete(u),Fx(a,s,t,()=>{e.destroyNode(u)})),c!=null&&qD(e,n,t,c,s,i,o)}}function LD(n,e){FS(n,e),e[hi]=null,e[On]=null}function FD(n,e,t,i,r,s){i[hi]=r,i[On]=e,Dd(n,i,t,1,r,s)}function FS(n,e){e[Ri].changeDetectionScheduler?.notify(9),Dd(n,e,e[Ht],2,null,null)}function kD(n){let e=n[zo];if(!e)return Km(n[Le],n);for(;e;){let t=null;if(qr(e))t=e[zo];else{let i=e[Lt];i&&(t=i)}if(!t){for(;e&&!e[ti]&&e!==n;)qr(e)&&Km(e[Le],e),e=e[Ft];e===null&&(e=n),qr(e)&&Km(e[Le],e),t=e&&e[ti]}e=t}}function Hg(n,e){let t=n[js],i=t.indexOf(e);t.splice(i,1)}function Td(n,e){if($s(e))return;let t=e[Ht];t.destroyNode&&Dd(n,e,t,3,null,null),kD(e)}function Km(n,e){if($s(e))return;let t=De(null);try{e[Ge]&=-129,e[Ge]|=256,e[Vn]&&tc(e[Vn]),BD(n,e),UD(n,e),e[Le].type===1&&e[Ht].destroy();let i=e[$r];if(i!==null&&ni(e[Ft])){i!==e[Ft]&&Hg(i,e);let r=e[Ni];r!==null&&r.detachView(n)}rg(e)}finally{De(t)}}function UD(n,e){let t=n.cleanup,i=e[Ho];if(t!==null)for(let o=0;o<t.length-1;o+=2)if(typeof t[o]=="string"){let a=t[o+3];a>=0?i[a]():i[-a].unsubscribe(),o+=2}else{let a=i[t[o+1]];t[o].call(a)}i!==null&&(e[Ho]=null);let r=e[ur];if(r!==null){e[ur]=null;for(let o=0;o<r.length;o++){let a=r[o];a()}}let s=e[Go];if(s!==null){e[Go]=null;for(let o of s)o.destroy()}}function BD(n,e){let t;if(n!=null&&(t=n.destroyHooks)!=null)for(let i=0;i<t.length;i+=2){let r=e[t[i]];if(!(r instanceof Dc)){let s=t[i+1];if(Array.isArray(s))for(let o=0;o<s.length;o+=2){let a=r[s[o]],c=s[o+1];St(ft.LifecycleHookStart,a,c);try{c.call(a)}finally{St(ft.LifecycleHookEnd,a,c)}}else{St(ft.LifecycleHookStart,r,s);try{s.call(r)}finally{St(ft.LifecycleHookEnd,r,s)}}}}}function VD(n,e,t){if(e===null)throw new Ce(510,!1);return HD(n,e.parent,t)}function HD(n,e,t){let i=e;for(;i!==null&&i.type&168;)e=i,i=e.parent;if(i===null)return t[hi];if(Xr(i)){let{encapsulation:r}=n.data[i.directiveStart+i.componentOffset];if(r===vi.None||r===vi.Emulated)return null}return pi(i,t)}function zD(n,e,t){return jD(n,e,t)}function GD(n,e,t){return n.type&40?pi(n,t):null}var jD=GD,kx;function zg(n,e,t,i){let r=VD(n,i,e),s=e[Ht],o=i.parent||e[On],a=zD(o,i,e);if(r!=null)if(Array.isArray(t))for(let c=0;c<t.length;c++)Nx(s,r,t[c],a,!1);else Nx(s,r,t,a,!1);kx!==void 0&&kx(s,i,e,t,r)}function Cc(n,e){if(e!==null){let t=e.type;if(t&3)return pi(e,n);if(t&4)return ug(-1,n[e.index]);if(t&8){let i=e.child;if(i!==null)return Cc(n,i);{let r=n[e.index];return ni(r)?ug(-1,r):mn(r)}}else{if(t&128)return Cc(n,e.next);if(t&32)return Ug(e,n)()||mn(n[e.index]);{let i=kS(n,e);if(i!==null){if(Array.isArray(i))return i[0];let r=fr(n[Ln]);return Cc(r,i)}else return Cc(n,e.next)}}}return null}function kS(n,e){if(e!==null){let i=n[Ln][On],r=e.projection;return i.projection[r]}return null}function ug(n,e){let t=Lt+n+1;if(t<e.length){let i=e[t],r=i[Le].firstChild;if(r!==null)return Cc(i,r)}return e[Gs]}function Gg(n,e,t,i,r,s,o){for(;t!=null;){let a=i[pr];if(t.type===128){t=t.next;continue}let c=i[t.index],l=t.type;if(o&&e===0&&(c&&Zo(mn(c),i),t.flags|=2),!Fg(t))if(l&8)Gg(n,e,t.child,i,r,s,!1),Xo(e,n,a,r,c,t,s,i);else if(l&32){let u=Ug(t,i),d;for(;d=u();)Xo(e,n,a,r,d,t,s,i);Xo(e,n,a,r,c,t,s,i)}else l&16?$D(n,e,i,t,r,s):Xo(e,n,a,r,c,t,s,i);t=o?t.projectionNext:t.next}}function Dd(n,e,t,i,r,s){n.type===3?WD(t,i,e,r,s):Gg(t,i,n.firstChild,e,r,s,!1)}function WD(n,e,t,i,r){let o=t[Le].firstChild,a=o.next,c=mn(t[o.index]),l=mn(t[a.index]),u=a.index+1,d=t[u];if(e===1||e===0)i!==null&&(d&&d.hasChildNodes()?qs(n,i,d,r,!0):(qs(n,i,c,r,!0),qs(n,i,l,r,!0)));else if(e===2){if(d||(d=document.createDocumentFragment(),t[u]=d),c&&c.parentNode===d)return;let f=c;for(;f!==null;){let h=f.nextSibling;if(d.appendChild(f),f===l)break;f=h}}}function $D(n,e,t,i,r,s){let o=t[Ln],c=o[On].projection[i.projection];if(Array.isArray(c))for(let l=0;l<c.length;l++){let u=c[l];Xo(e,n,t[pr],r,u,i,s,t)}else{let l=c,u=o[Ft];mS(i)&&(l.flags|=128),Gg(n,e,l,u,r,s,!0)}}function qD(n,e,t,i,r,s,o){let a=i[Gs],c=mn(i);if(a!==c&&Xo(e,n,t,s,a,r,o),(i[Ge]&4)===0)for(let l=Lt;l<i.length;l++){let u=i[l];Dd(u[Le],u,n,e,s,a)}}function XD(n,e,t,i,r){if(e)r?n.addClass(t,i):n.removeClass(t,i);else{let s=i.indexOf("-")===-1?void 0:_r.DashCase;r==null?n.removeStyle(t,i,s):(typeof r=="string"&&r.endsWith("!important")&&(r=r.slice(0,-10),s|=_r.Important),n.setStyle(t,i,r,s))}}function jg(n,e,t,i,r,s,o,a,c,l,u){let d=pn+i,f=d+r,h=YD(d,f),g=typeof l=="function"?l():l;return h[Le]={type:n,blueprint:h,template:t,queries:null,viewQuery:a,declTNode:e,data:h.slice().fill(null,d),bindingStartIndex:d,expandoStartIndex:f,hostBindingOpCodes:null,firstCreatePass:!0,firstUpdatePass:!0,staticViewQueries:!1,staticContentQueries:!1,preOrderHooks:null,preOrderCheckHooks:null,contentHooks:null,contentCheckHooks:null,viewHooks:null,viewCheckHooks:null,destroyHooks:null,cleanup:null,contentQueries:null,components:null,directiveRegistry:typeof s=="function"?s():s,pipeRegistry:typeof o=="function"?o():o,firstChild:null,schemas:c,consts:g,incompleteFirstPass:!1,ssrId:u}}function YD(n,e){let t=[];for(let i=0;i<e;i++)t.push(i<n?null:ri);return t}function ZD(n){let e=n.tView;return e===null||e.incompleteFirstPass?n.tView=jg(1,null,n.template,n.decls,n.vars,n.directiveDefs,n.pipeDefs,n.viewQuery,n.schemas,n.consts,n.id):e}function Wg(n,e,t,i,r,s,o,a,c,l,u){let d=e.blueprint.slice();return d[hi]=r,d[Ge]=i|4|128|8|64|1024,(l!==null||n&&n[Ge]&2048)&&(d[Ge]|=2048),Cm(d),d[Ft]=d[Wr]=n,d[Ot]=t,d[Ri]=o||n&&n[Ri],d[Ht]=a||n&&n[Ht],d[pr]=c||n&&n[pr]||null,d[On]=s,d[yc]=cD(),d[Vo]=u,d[Sm]=l,d[Ln]=e.type==2?n[Ln]:d,d}function KD(n,e,t){let i=pi(e,n),r=ZD(t),s=n[Ri].rendererFactory,o=$g(n,Wg(n,r,null,US(t),i,e,null,s.createRenderer(i,t),null,null,null));return n[e.index]=o}function US(n){let e=16;return n.signals?e=4096:n.onPush&&(e=64),e}function BS(n,e,t,i){if(t===0)return-1;let r=e.length;for(let s=0;s<t;s++)e.push(i),n.blueprint.push(i),n.data.push(null);return r}function $g(n,e){return n[zo]?n[xm][ti]=e:n[zo]=e,n[xm]=e,e}function Ke(n=1){VS(ii(),dt(),mr()+n,!1)}function VS(n,e,t,i){if(!i)if((e[Ge]&3)===3){let s=n.preOrderCheckHooks;s!==null&&sd(e,s,t)}else{let s=n.preOrderHooks;s!==null&&od(e,s,0,t)}Yr(t)}var Id=(function(n){return n[n.None=0]="None",n[n.SignalBased=1]="SignalBased",n[n.HasDecoratorInputTransform=2]="HasDecoratorInputTransform",n})(Id||{});function dg(n,e,t,i){let r=De(null);try{let[s,o,a]=n.inputs[t],c=null;(o&Id.SignalBased)!==0&&(c=e[s][ln]),c!==null&&c.transformFn!==void 0?i=c.transformFn(i):a!==null&&(i=a.call(e,i)),n.setInput!==null?n.setInput(e,c,i,t,s):tS(e,c,s,i)}finally{De(r)}}function HS(n,e,t,i,r){let s=mr(),o=i&2;try{Yr(-1),o&&e.length>pn&&VS(n,e,pn,!1);let a=o?ft.TemplateUpdateStart:ft.TemplateCreateStart;St(a,r,t),t(i,r)}finally{Yr(s);let a=o?ft.TemplateUpdateEnd:ft.TemplateCreateEnd;St(a,r,t)}}function zS(n,e,t){nI(n,e,t),(t.flags&64)===64&&iI(n,e,t)}function qg(n,e,t=pi){let i=e.localNames;if(i!==null){let r=e.index+1;for(let s=0;s<i.length;s+=2){let o=i[s+1],a=o===-1?t(e,n):n[o];n[r++]=a}}}function JD(n,e,t,i){let s=i.get(bS,MS)||t===vi.ShadowDom||t===vi.ExperimentalIsolatedShadowDom,o=n.selectRootElement(e,s);return QD(o),o}function QD(n){eI(n)}var eI=()=>null;function tI(n,e,t,i,r,s){if(n.type&3){let o=pi(n,e);i=s!=null?s(i,n.value||"",t):i,i=GS(t,o,i),r.setProperty(o,t,i)}else n.type&12}function GS(n,e,t,i=!1){return n==="src"&&(e.tagName==="IMG"||e.tagName==="VIDEO")?t==null?i?t:"":pd(t):t}function nI(n,e,t){let i=t.directiveStart,r=t.directiveEnd;Xr(t)&&KD(e,t,n.data[i+t.componentOffset]),n.firstCreatePass||cS(t,e);let s=t.initialInputs;for(let o=i;o<r;o++){let a=n.data[o],c=fd(e,n,o,t);if(Zo(c,e),s!==null&&cI(e,o-i,c,a,t,s),Ws(a)){let l=Pi(t.index,e);l[Ot]=fd(e,n,o,t)}}}function iI(n,e,t){let i=t.directiveStart,r=t.directiveEnd,s=t.index,o=cx();try{Yr(s);for(let a=i;a<r;a++){let c=n.data[a],l=e[a];Zu(a),(c.hostBindings!==null||c.hostVars!==0||c.hostAttrs!==null)&&rI(c,l)}}finally{Yr(-1),Zu(o)}}function rI(n,e){n.hostBindings!==null&&n.hostBindings(1,e)}function sI(n,e){let t=n.directiveRegistry,i=null;if(t)for(let r=0;r<t.length;r++){let s=t[r];bD(e,s.selectors,!1)&&(i??=[],Ws(s)?i.unshift(s):i.push(s))}return i}function oI(n,e,t,i,r,s){let o=pi(n,e);i=GS(t,o,i,!0),aI(e[Ht],o,s,n.value,t,i,r)}function aI(n,e,t,i,r,s,o){if(s==null)o?.(s,i||"",r),n.removeAttribute(e,r,t);else{let a=o==null?pc(s):o(s,i||"",r);n.setAttribute(e,r,a,t)}}function cI(n,e,t,i,r,s){let o=s[e];if(o!==null)for(let a=0;a<o.length;a+=2){let c=o[a],l=o[a+1];dg(i,t,c,l)}}function jS(n,e,t,i,r){let s=pn+t,o=e[Le],a=r(o,e,n,i,t);e[s]=a,Wo(n,!0);let c=n.type===2;return c?(RS(e[Ht],a,n),(K0()===0||Wu(n))&&Zo(a,e),J0()):Zo(a,e),ed()&&(!c||!Fg(n))&&zg(o,e,a,n),n}function WS(n){let e=n;return Om()?nx():(e=e.parent,Wo(e,!1)),e}function lI(n,e){let t=n[pr];if(!t)return;let i;try{i=t.get(ki,null)}catch{i=null}i?.(e)}function $S(n,e,t,i,r){let s=n.inputs?.[i],o=n.hostDirectiveInputs?.[i],a=!1;if(o)for(let c=0;c<o.length;c+=2){let l=o[c],u=o[c+1],d=e.data[l];dg(d,t[l],u,r),a=!0}if(s)for(let c of s){let l=t[c],u=e.data[c];dg(u,l,i,r),a=!0}return a}function uI(n,e){let t=Pi(e,n),i=t[Le];dI(i,t);let r=t[hi];r!==null&&t[Vo]===null&&(t[Vo]=wS(r,t[pr])),St(ft.ComponentStart);try{Xg(i,t,t[Ot])}finally{St(ft.ComponentEnd,t[Ot])}}function dI(n,e){for(let t=e.length;t<n.blueprint.length;t++)e.push(n.blueprint[t])}function Xg(n,e,t){Ju(e);try{let i=n.viewQuery;i!==null&&og(1,i,t);let r=n.template;r!==null&&HS(n,e,r,1,t),n.firstCreatePass&&(n.firstCreatePass=!1),e[Ni]?.finishViewCreation(n),n.staticContentQueries&&CS(n,e),n.staticViewQueries&&og(2,n.viewQuery,t);let s=n.components;s!==null&&fI(e,s)}catch(i){throw n.firstCreatePass&&(n.incompleteFirstPass=!0,n.firstCreatePass=!1),i}finally{e[Ge]&=-5,Qu()}}function fI(n,e){for(let t=0;t<e.length;t++)uI(n,e[t])}function Ad(n,e,t,i){let r=De(null);try{let s=e.tView,a=n[Ge]&4096?4096:16,c=Wg(n,s,t,a,null,e,null,null,i?.injector??null,i?.embeddedViewInjector??null,i?.dehydratedView??null),l=n[e.index];c[$r]=l;let u=n[Ni];return u!==null&&(c[Ni]=u.createEmbeddedView(s)),Xg(s,c,t),c}finally{De(r)}}function Ic(n,e){return!e||e.firstChild===null||mS(n)}function Ac(n,e,t,i,r=!1){if(n.type===3){let s=n.firstChild,o=s.next,a=mn(e[s.index]),c=mn(e[o.index]),l=a;for(;l!==null&&(i.push(l),l!==c);)l=l.nextSibling;return i}for(;t!==null;){if(t.type===128){t=r?t.projectionNext:t.next;continue}let s=e[t.index];if(s!==null)if(ni(s)){let a=s[Gs];a!==s[hi]&&i.push(mn(s)),s[Ge]&4||qS(s,i),i.push(a)}else i.push(mn(s));let o=t.type;if(o&8)Ac(n,e,t.child,i);else if(o&32){let a=Ug(t,e),c;for(;c=a();)i.push(c)}else if(o&16){let a=kS(e,t);if(Array.isArray(a))i.push(...a);else{let c=fr(e[Ln]);Ac(c[Le],c,a,i,!0)}}t=r?t.projectionNext:t.next}return i}function qS(n,e){for(let t=Lt;t<n.length;t++){let i=n[t],r=i[Le].firstChild;r!==null&&Ac(i[Le],i,r,e)}}function XS(n){if(n[ju]!==null){for(let e of n[ju])e.impl.addSequence(e);n[ju].length=0}}var YS=[];function hI(n){return n[Vn]??pI(n)}function pI(n){let e=YS.pop()??Object.create(gI);return e.lView=n,e}function mI(n){n.lView[Vn]!==n&&(n.lView=null,YS.push(n))}var gI=_t(he({},Mo),{consumerIsAlwaysLive:!0,kind:"template",consumerMarkedDirty:n=>{Ec(n.lView)},consumerOnSignalRead(){this.lView[Vn]=this}});function vI(n){let e=n[Vn]??Object.create(yI);return e.lView=n,e}var yI=_t(he({},Mo),{consumerIsAlwaysLive:!0,kind:"template",consumerMarkedDirty:n=>{let e=fr(n.lView);for(;e&&!ZS(e[Le]);)e=fr(e);e&&Tm(e)},consumerOnSignalRead(){this.lView[Vn]=this}});function ZS(n){return n.type!==2}function KS(n){if(n[Go]===null)return;let e=!0;for(;e;){let t=!1;for(let i of n[Go])if(i.dirty&&(t=!0,i.zone===null||Zone.current===i.zone?i.run():i.zone.run(()=>i.run()),n[Go]===null))return;e=t&&!!(n[Ge]&8192)}}var _I=100;function JS(n,e=0){let i=n[Ri].rendererFactory,r=!1;r||i.begin?.();try{xI(n,e)}finally{r||i.end?.()}}function xI(n,e){let t=Lm();try{Fm(!0),fg(n,e);let i=0;for(;Sc(n);){if(i===_I)throw new Ce(103,!1);i++,fg(n,1)}}finally{Fm(t)}}function SI(n,e,t,i){if($s(e))return;let r=e[Ge],s=!1,o=!1;Ju(e);let a=!0,c=null,l=null;s||(ZS(n)?(l=hI(e),c=bo(l)):su()===null?(a=!1,l=vI(e),c=bo(l)):e[Vn]&&(tc(e[Vn]),e[Vn]=null));try{Cm(e),sx(n.bindingStartIndex),t!==null&&HS(n,e,t,2,i);let u=(r&3)===3;if(!s)if(u){let h=n.preOrderCheckHooks;h!==null&&sd(e,h,null)}else{let h=n.preOrderHooks;h!==null&&od(e,h,0,null),Ym(e,0)}if(o||EI(e),KS(e),eE(e,0),n.contentQueries!==null&&CS(n,e),!s)if(u){let h=n.contentCheckHooks;h!==null&&sd(e,h)}else{let h=n.contentHooks;h!==null&&od(e,h,1),Ym(e,1)}bI(n,e);let d=n.components;d!==null&&nE(e,d,0);let f=n.viewQuery;if(f!==null&&og(2,f,i),!s)if(u){let h=n.viewCheckHooks;h!==null&&sd(e,h)}else{let h=n.viewHooks;h!==null&&od(e,h,2),Ym(e,2)}if(n.firstUpdatePass===!0&&(n.firstUpdatePass=!1),e[Gu]){for(let h of e[Gu])h();e[Gu]=null}s||(XS(e),e[Ge]&=-73)}catch(u){QS(e,u,s)}finally{l!==null&&(ec(l,c),a&&mI(l)),Qu()}}function QS(n,e,t){let i=!1,r=e,s=n,o=De(null);try{for(;s!==null;){if(ni(s)){s=s[Ft];continue}let a=s[_c];if(a)try{let c=n[Ln][Ot],l=c?.constructor,u={declarationInstance:c,declarationType:l,caughtBy:a},d=De(null);try{a(xx(r),u)}finally{De(d)}i=!0;break}catch(c){r=c}s=s[Ft]}}finally{De(o)}if(!i)throw t||Ec(n),r}function eE(n,e){for(let t=vS(n);t!==null;t=yS(t))for(let i=Lt;i<t.length;i++){let r=t[i];tE(r,e)}}function EI(n){for(let e=vS(n);e!==null;e=yS(e)){if(!(e[Ge]&2))continue;let t=e[js];for(let i=0;i<t.length;i++){let r=t[i];Tm(r)}}}function MI(n,e,t){St(ft.ComponentStart);let i=Pi(e,n);try{tE(i,t)}finally{St(ft.ComponentEnd,i[Ot])}}function tE(n,e){qu(n)&&fg(n,e)}function fg(n,e){let i=n[Le],r=n[Ge],s=n[Vn],o=!!(e===0&&r&16);if(o||=!!(r&64&&e===0),o||=!!(r&1024),o||=!!(s?.dirty&&ou(s)),o||=!1,s&&(s.dirty=!1),n[Ge]&=-9217,o)SI(i,n,i.template,n[Ot]);else if(r&8192){let a=De(null);try{try{KS(n)}catch(l){QS(n,l,!1)}eE(n,1);let c=i.components;c!==null&&nE(n,c,1),XS(n)}finally{De(a)}}}function nE(n,e,t){for(let i=0;i<e.length;i++)MI(n,e[i],t)}function bI(n,e){let t=n.hostBindingOpCodes;if(t!==null)try{for(let i=0;i<t.length;i++){let r=t[i];if(r<0)Yr(~r);else{let s=r,o=t[++i],a=t[++i];ax(o,s);let c=e[s];St(ft.HostBindingsUpdateStart,c);try{a(2,c)}finally{St(ft.HostBindingsUpdateEnd,c)}}}}finally{Yr(-1)}}function Yg(n,e){let t=Lm()?64:1088;for(n[Ri].changeDetectionScheduler?.notify(e);n;){n[Ge]|=t;let i=fr(n);if(jo(n)&&!i)return n;n=i}return null}function iE(n,e,t,i){return[n,!0,0,e,null,i,null,t,null,null]}function rE(n,e){let t=Lt+e;if(t<n.length)return n[t]}function Rd(n,e,t,i=!0){let r=e[Le];if(wI(r,e,n,t),i){let o=ug(t,n),a=e[Ht],c=a.parentNode(n[Gs]);c!==null&&FD(r,n[On],a,e,c,o)}let s=e[Vo];s!==null&&s.firstChild!==null&&(s.firstChild=null)}function sE(n,e){let t=Rc(n,e);return t!==void 0&&Td(t[Le],t),t}function Rc(n,e){if(n.length<=Lt)return;let t=Lt+e,i=n[t];if(i){let r=i[$r];r!==null&&r!==n&&Hg(r,i),e>0&&(n[t-1][ti]=i[ti]);let s=mc(n,Lt+e);LD(i[Le],i);let o=s[Ni];o!==null&&o.detachView(s[Le]),i[Ft]=null,i[ti]=null,i[Ge]&=-129}return i}function wI(n,e,t,i){let r=Lt+i,s=t.length;i>0&&(t[r-1][ti]=e),i<s-Lt?(e[ti]=t[r],mm(t,Lt+i,e)):(t.push(e),e[ti]=null),e[Ft]=t;let o=e[$r];o!==null&&t!==o&&oE(o,e);let a=e[Ni];a!==null&&a.insertView(n),Xu(e),e[Ge]|=128}function oE(n,e){let t=n[js],i=e[Ft];if(qr(i))n[Ge]|=2;else{let r=i[Ft][Ln];e[Ln]!==r&&(n[Ge]|=2)}t===null?n[js]=[e]:t.push(e)}var Kr=class{_lView;_cdRefInjectingView;_appRef=null;_attachedToViewContainer=!1;exhaustive;get rootNodes(){let e=this._lView,t=e[Le];return Ac(t,e,t.firstChild,[])}constructor(e,t){this._lView=e,this._cdRefInjectingView=t}get context(){return this._lView[Ot]}set context(e){this._lView[Ot]=e}get destroyed(){return $s(this._lView)}destroy(){if(this._appRef)this._appRef.detachView(this);else if(this._attachedToViewContainer){let e=this._lView[Ft];if(ni(e)){let t=e[xc],i=t?t.indexOf(this):-1;i>-1&&(Rc(e,i),mc(t,i))}this._attachedToViewContainer=!1}Td(this._lView[Le],this._lView)}onDestroy(e){Yu(this._lView,e)}markForCheck(){Yg(this._cdRefInjectingView||this._lView,4)}detach(){this._lView[Ge]&=-129}reattach(){Xu(this._lView),this._lView[Ge]|=128}detectChanges(){this._lView[Ge]|=1024,JS(this._lView)}checkNoChanges(){}attachToViewContainerRef(){if(this._appRef)throw new Ce(902,!1);this._attachedToViewContainer=!0}detachFromAppRef(){this._appRef=null;let e=jo(this._lView),t=this._lView[$r];t!==null&&!e&&Hg(t,this._lView),FS(this._lView[Le],this._lView)}attachToAppRef(e){if(this._attachedToViewContainer)throw new Ce(902,!1);this._appRef=e;let t=jo(this._lView),i=this._lView[$r];i!==null&&!t&&oE(i,this._lView),Xu(this._lView)}};var Ko=(()=>{class n{_declarationLView;_declarationTContainer;elementRef;static __NG_ELEMENT_ID__=CI;constructor(t,i,r){this._declarationLView=t,this._declarationTContainer=i,this.elementRef=r}get ssrId(){return this._declarationTContainer.tView?.ssrId||null}createEmbeddedView(t,i){return this.createEmbeddedViewImpl(t,i)}createEmbeddedViewImpl(t,i,r){let s=Ad(this._declarationLView,this._declarationTContainer,t,{embeddedViewInjector:i,dehydratedView:r});return new Kr(s)}}return n})();function CI(){return Zg(mi(),dt())}function Zg(n,e){return n.type&4?new Ko(e,n,ea(n,e)):null}function Nd(n,e,t,i,r){let s=n.data[e];if(s===null)s=TI(n,e,t,i,r),ox()&&(s.flags|=32);else if(s.type&64){s.type=t,s.value=i,s.attrs=r;let o=tx();s.injectorIndex=o===null?-1:o.injectorIndex}return Wo(s,!0),s}function TI(n,e,t,i,r){let s=Pm(),o=Om(),a=o?s:s&&s.parent,c=n.data[e]=II(n,a,t,e,i,r);return DI(n,c,s,o),c}function DI(n,e,t,i){n.firstChild===null&&(n.firstChild=e),t!==null&&(i?t.child==null&&e.parent!==null&&(t.child=e):t.next===null&&(t.next=e,e.prev=t))}function II(n,e,t,i,r,s){let o=e?e.injectorIndex:-1,a=0;return ex()&&(a|=128),{type:t,index:i,insertBeforeIndex:null,injectorIndex:o,directiveStart:-1,directiveEnd:-1,directiveStylingLast:-1,componentOffset:-1,controlDirectiveIndex:-1,customControlIndex:-1,propertyBindings:null,flags:a,providerIndexes:0,value:r,namespace:Hm(),attrs:s,mergedAttrs:null,localNames:null,initialInputs:null,inputs:null,hostDirectiveInputs:null,outputs:null,hostDirectiveOutputs:null,directiveToIndex:null,tView:null,next:null,prev:null,projectionNext:null,child:null,parent:e,projection:null,styles:null,stylesWithoutHost:null,residualStyles:void 0,classes:null,classesWithoutHost:null,residualClasses:void 0,classBindings:0,styleBindings:0}}function AI(n){let e=n[Em]??[],i=n[Ft][Ht],r=[];for(let s of e)s.data[ES]!==void 0?r.push(s):RI(s,i);n[Em]=r}function RI(n,e){let t=0,i=n.firstChild;if(i){let r=n.data[SS];for(;t<r;){let s=i.nextSibling;AS(e,i,!1),i=s,t++}}}var NI=()=>null,PI=()=>null;function hg(n,e){return NI(n,e)}function aE(n,e,t){return PI(n,e,t)}var cE=class{},Xs=class{};var lE=(()=>{class n{static \u0275prov=ut({token:n,providedIn:"root",factory:()=>null})}return n})();function uE(n){return n.debugInfo?.className||n.type.name||null}var cd={},md=class{injector;parentInjector;constructor(e,t){this.injector=e,this.parentInjector=t}get(e,t,i){let r=this.injector.get(e,cd,i);return r!==cd||t===cd?r:this.parentInjector.get(e,t,i)}};function OI(n,e,t){return n[e]=t}function LI(n,e){return n[e]}function Jr(n,e,t){if(t===ri)return!1;let i=n[e];return Object.is(i,t)?!1:(n[e]=t,!0)}function FI(n,e,t,i){let r=Jr(n,e,t);return Jr(n,e+1,i)||r}function kI(n,e,t){return function i(r){let s=i.__ngNativeEl__;s!==void 0&&uD(r,s);let o=Xr(n)?Pi(n.index,e):e;Yg(o,5);let a=e[Ot],c=Ux(e,a,t,r),l=i.__ngNextListenerFn__;for(;l;)c=Ux(e,a,l,r)&&c,l=l.__ngNextListenerFn__;return c}}function Ux(n,e,t,i){let r=De(null);try{return St(ft.OutputStart,e,t),t(i)!==!1}catch(s){return lI(n,s),!1}finally{St(ft.OutputEnd,e,t),De(r)}}function UI(n,e,t,i,r,s,o,a){let c=Wu(n),l=!1,u=null;if(!i&&c&&(u=VI(e,t,s,n.index)),u!==null){let d=u.__ngLastListenerFn__||u;d.__ngNextListenerFn__=o,u.__ngLastListenerFn__=o,l=!0}else{let d=pi(n,t),f=i?i(d):d;fD(t,f,s,a),i||(a.__ngNativeEl__=d);let h=r.listen(f,s,a);if(!BI(s)){let g=i?x=>i(mn(x[n.index])):n.index;HI(g,e,t,s,a,h,!1)}}return l}function BI(n){return n.startsWith("animation")||n.startsWith("transition")}function VI(n,e,t,i){let r=n.cleanup;if(r!=null)for(let s=0;s<r.length-1;s+=2){let o=r[s];if(o===t&&r[s+1]===i){let a=e[Ho],c=r[s+2];return a&&a.length>c?a[c]:null}typeof o=="string"&&(s+=2)}return null}function HI(n,e,t,i,r,s,o){let a=e.firstCreatePass?Im(e):null,c=Dm(t),l=c.length;c.push(r,s),a&&a.push(i,n,l,(l+1)*(o?-1:1))}var pg=Symbol("BINDING");var Js=new Pe("");function gd(n,e,t){let i=t?n.styles:null,r=t?n.classes:null,s=0;if(e!==null)for(let o=0;o<e.length;o++){let a=e[o];if(typeof a=="number")s=a;else if(s==1)r=om(r,a);else if(s==2){let c=a,l=e[++o];i=om(i,c+": "+l+";")}}t?n.styles=i:n.stylesWithoutHost=i,t?n.classes=r:n.classesWithoutHost=r}function Kg(n,e=0){let t=dt();if(t===null)return qe(n,e);let i=mi();return fS(i,t,Bn(n),e)}function zI(n,e,t,i,r){let s=i===null?null:{"":-1},o=r(n,t);if(o!==null){let a=o,c=null,l=null;for(let u of o)if(u.resolveHostDirectives!==null){[a,c,l]=u.resolveHostDirectives(o);break}WI(n,e,t,a,s,c,l)}s!==null&&i!==null&&GI(t,i,s)}function GI(n,e,t){let i=n.localNames=[];for(let r=0;r<e.length;r+=2){let s=t[e[r+1]];if(s==null)throw new Ce(-301,!1);i.push(e[r],s)}}function jI(n,e,t){e.componentOffset=t,(n.components??=[]).push(e.index)}function WI(n,e,t,i,r,s,o){let a=i.length,c=null;for(let f=0;f<a;f++){let h=i[f];c===null&&Ws(h)&&(c=h,jI(n,t,f)),QT(cS(t,e),n,h.type)}KI(t,n.data.length,a),c?.viewProvidersResolver&&c.viewProvidersResolver(c);for(let f=0;f<a;f++){let h=i[f];h.providersResolver&&h.providersResolver(h)}let l=!1,u=!1,d=BS(n,e,a,null);a>0&&(t.directiveToIndex=new Map);for(let f=0;f<a;f++){let h=i[f];if(t.mergedAttrs=Cd(t.mergedAttrs,h.hostAttrs),qI(n,t,e,d,h),ZI(d,h,r),o!==null&&o.has(h)){let[x,p]=o.get(h);t.directiveToIndex.set(h.type,[d,x+t.directiveStart,p+t.directiveStart])}else(s===null||!s.has(h))&&t.directiveToIndex.set(h.type,d);h.contentQueries!==null&&(t.flags|=4),(h.hostBindings!==null||h.hostAttrs!==null||h.hostVars!==0)&&(t.flags|=64);let g=h.type.prototype;!l&&(g.ngOnChanges||g.ngOnInit||g.ngDoCheck)&&((n.preOrderHooks??=[]).push(t.index),l=!0),!u&&(g.ngOnChanges||g.ngDoCheck)&&((n.preOrderCheckHooks??=[]).push(t.index),u=!0),d++}$I(n,t,s)}function $I(n,e,t){for(let i=e.directiveStart;i<e.directiveEnd;i++){let r=n.data[i];if(t===null||!t.has(r))Bx(0,e,r,i),Bx(1,e,r,i),Hx(e,i,!1);else{let s=t.get(r);Vx(0,e,s,i),Vx(1,e,s,i),Hx(e,i,!0)}}}function Bx(n,e,t,i){let r=n===0?t.inputs:t.outputs;for(let s in r)if(Object.hasOwn(r,s)){let o;n===0?o=e.inputs??={}:o=e.outputs??={},o[s]??=[],o[s].push(i),dE(e,s)}}function Vx(n,e,t,i){let r=n===0?t.inputs:t.outputs;for(let s in r)if(Object.hasOwn(r,s)){let o=r[s],a;n===0?a=e.hostDirectiveInputs??={}:a=e.hostDirectiveOutputs??={},a[o]??=[],a[o].push(i,s),dE(e,o)}}function dE(n,e){e==="class"?n.flags|=8:e==="style"&&(n.flags|=16)}function Hx(n,e,t){let{attrs:i,inputs:r,hostDirectiveInputs:s}=n;if(i===null||!t&&r===null||t&&s===null||kg(n)){n.initialInputs??=[],n.initialInputs.push(null);return}let o=null,a=0;for(;a<i.length;){let c=i[a];if(c===0){a+=4;continue}else if(c===5){a+=2;continue}else if(typeof c=="number")break;if(!t&&Object.hasOwn(r,c)){let l=r[c];for(let u of l)if(u===e){o??=[],o.push(c,i[a+1]);break}}else if(t&&Object.hasOwn(s,c)){let l=s[c];for(let u=0;u<l.length;u+=2)if(l[u]===e){o??=[],o.push(l[u+1],i[a+1]);break}}a+=2}n.initialInputs??=[],n.initialInputs.push(o)}function qI(n,e,t,i,r){n.data[i]=r;let s=r.factory||(r.factory=Lo(r.type,!0)),o=new Dc(s,Ws(r),Kg,null);n.blueprint[i]=o,t[i]=o,XI(n,e,i,BS(n,t,r.hostVars,ri),r)}function XI(n,e,t,i,r){let s=r.hostBindings;if(s){let o=n.hostBindingOpCodes;o===null&&(o=n.hostBindingOpCodes=[]);let a=~e.index;YI(o)!=a&&o.push(a),o.push(t,i,s)}}function YI(n){let e=n.length;for(;e>0;){let t=n[--e];if(typeof t=="number"&&t<0)return t}return 0}function ZI(n,e,t){if(t){if(e.exportAs)for(let i=0;i<e.exportAs.length;i++)t[e.exportAs[i]]=n;Ws(e)&&(t[""]=n)}}function KI(n,e,t){n.flags|=1,n.directiveStart=e,n.directiveEnd=e+t,n.providerIndexes=e}function fE(n,e,t,i,r,s,o,a){let c=e[Le],l=c.consts,u=Oi(l,o),d=Nd(c,n,t,i,u);return s&&zI(c,e,d,Oi(l,a),r),d.mergedAttrs=Cd(d.mergedAttrs,d.attrs),d.attrs!==null&&gd(d,d.attrs,!1),d.mergedAttrs!==null&&gd(d,d.mergedAttrs,!0),c.queries!==null&&c.queries.elementStart(c,d),d}function hE(n,e){zT(n,e),Mm(e)&&n.queries.elementEnd(e)}function JI(n,e,t,i,r,s){let o=e.consts,a=Oi(o,r),c=Nd(e,n,t,i,a);if(c.mergedAttrs=Cd(c.mergedAttrs,c.attrs),s!=null){let l=Oi(o,s);c.localNames=[];for(let u=0;u<l.length;u+=2)c.localNames.push(l[u],-1)}return c.attrs!==null&&gd(c,c.attrs,!1),c.mergedAttrs!==null&&gd(c,c.mergedAttrs,!0),e.queries!==null&&e.queries.elementStart(e,c),c}var pE=typeof ShadowRoot<"u",QI=typeof Document<"u";function eA(n){return Object.keys(n).map(e=>{let[t,i,r]=n[e],s={propName:t,templateName:e,isSignal:(i&Id.SignalBased)!==0};return r&&(s.transform=r),s})}function tA(n){return Object.keys(n).map(e=>({propName:n[e],templateName:e}))}function nA(n,e,t){let i=e instanceof nn?e:e?.injector;return i&&n.getStandaloneInjector!==null&&(i=n.getStandaloneInjector(i)||i),i?new md(t,i):t}function iA(n){let e=n.get(Xs,null);if(e===null)throw new Ce(407,!1);let t=n.get(lE,null),i=n.get(ko,null),r=n.get(Zs,null,{optional:!0});return{rendererFactory:e,sanitizer:t,changeDetectionScheduler:i,ngReflect:!1,tracingService:r}}function rA(n,e,t){let i=mE(n);return DS(e,i,i==="svg"?bm:i==="math"?$0:t)}function sA(n){if((n&&"localName"in n&&typeof n.localName=="string"?n.localName:n?.tagName)?.toLowerCase()==="script")throw new Ce(905,!1)}function mE(n){return(n.selectors[0][0]||"div").toLowerCase()}var Nc=class{componentDef;ngModule;selector;componentType;ngContentSelectors;isBoundToModule;cachedInputs=null;cachedOutputs=null;get inputs(){return this.cachedInputs??=eA(this.componentDef.inputs),this.cachedInputs}get outputs(){return this.cachedOutputs??=tA(this.componentDef.outputs),this.cachedOutputs}constructor(e,t){this.componentDef=e,this.ngModule=t,this.componentType=e.type,this.selector=DD(e.selectors),this.ngContentSelectors=e.ngContentSelectors??[],this.isBoundToModule=!!t}create(e,t,i,r,s,o,a,c){St(ft.DynamicComponentStart);let l=De(null);try{let u=this.componentDef,d=nA(u,r||this.ngModule,e),f=iA(d),h=f.tracingService;return h&&h.componentCreate?h.componentCreate(uE(u),()=>this.createComponentRef(f,d,t,i,s,o,a,c)):this.createComponentRef(f,d,t,i,s,o,a,c)}finally{De(l)}}createComponentRef(e,t,i,r,s,o,a,c){let l=this.componentDef,u=oA(r,l,o,s,c),d=e.rendererFactory.createRenderer(null,l),f=r?JD(d,r,l.encapsulation,t):rA(l,d,a??null);sA(f);let h=t.get(Js,null),g=aA(f,()=>t.get(zt,null)??xS());h&&h.addHost(g);let x=o?.some(zx)||s?.some(S=>typeof S!="function"&&S.bindings.some(zx)),p=Wg(null,u,null,512|US(l),null,null,e,d,t,null,wS(f,t,!0));h&&pE&&g instanceof ShadowRoot&&Yu(p,()=>{h.removeHost(g)}),p[pn]=f,Ju(p);let m=null;try{let S=fE(pn,p,2,"#host",()=>u.directiveRegistry,!0,0);RS(d,f,S),Zo(f,p),zS(u,p,S),TS(u,S,p),hE(u,S),i!==void 0&&lA(S,this.ngContentSelectors,i),m=Pi(S.index,p),p[Ot]=m[Ot],Xg(u,p,null)}catch(S){throw m!==null&&rg(m),rg(p),S}finally{St(ft.DynamicComponentEnd),Qu()}return new vd(this.componentType,p,!!x)}};function oA(n,e,t,i,r){let s=n?["ng-version","22.2.5"]:ID(e.selectors[0]),o=null,a=null,c=0;if(t)for(let d of t)c+=d[pg].requiredVars,d.create&&(d.targetIdx=0,(o??=[]).push(d)),d.update&&(d.targetIdx=0,(a??=[]).push(d));if(i)for(let d=0;d<i.length;d++){let f=i[d];if(typeof f!="function")for(let h of f.bindings){c+=h[pg].requiredVars;let g=d+1;h.create&&(h.targetIdx=g,(o??=[]).push(h)),h.update&&(h.targetIdx=g,(a??=[]).push(h))}}let l=[e];if(i)for(let d of i){let f=typeof d=="function"?d:d.type,h=Uu(f);l.push(h)}return jg(0,null,cA(o,a),1,c,l,null,null,null,[s],null)}function aA(n,e){let t=n.getRootNode?.();return QI&&t instanceof Document?t.head:t&&pE&&t instanceof ShadowRoot?t:e().head}function cA(n,e){return!n&&!e?null:t=>{if(t&1&&n)for(let i of n)i.create();if(t&2&&e)for(let i of e)i.update()}}function zx(n){let e=n[pg].kind;return e==="input"||e==="twoWay"}var vd=class extends cE{_rootLView;_hasInputBindings;instance;hostView;changeDetectorRef;componentType;location;previousInputValues=null;_tNode;constructor(e,t,i){super(),this._rootLView=t,this._hasInputBindings=i,this._tNode=$u(t[Le],pn),this.location=ea(this._tNode,t),this.instance=Pi(this._tNode.index,t)[Ot],this.hostView=this.changeDetectorRef=new Kr(t,void 0),this.componentType=e}setInput(e,t){this._hasInputBindings;let i=this._tNode;if(this.previousInputValues??=new Map,this.previousInputValues.has(e)&&Object.is(this.previousInputValues.get(e),t))return;let r=this._rootLView,s=$S(i,r[Le],r,e,t);this.previousInputValues.set(e,t);let o=Pi(i.index,r);Yg(o,1)}get injector(){return new yr(this._tNode,this._rootLView)}destroy(){this.hostView.destroy()}onDestroy(e){this.hostView.onDestroy(e)}};function lA(n,e,t){let i=n.projection=[];for(let r=0;r<e.length;r++){let s=t[r];i.push(s!=null&&s.length?Array.from(s):null)}}var Qs=(()=>{class n{static __NG_ELEMENT_ID__=uA}return n})();function uA(){let n=mi();return gE(n,dt())}var mg=class n extends Qs{_lContainer;_hostTNode;_hostLView;constructor(e,t,i){super(),this._lContainer=e,this._hostTNode=t,this._hostLView=i}get element(){return ea(this._hostTNode,this._hostLView)}get injector(){return new yr(this._hostTNode,this._hostLView)}get parentInjector(){let e=Pg(this._hostTNode,this._hostLView);if(sS(e)){let t=dd(e,this._hostLView),i=ud(e),r=t[Le].data[i+8];return new yr(r,t)}else return new yr(null,this._hostLView)}clear(){for(;this.length>0;)this.remove(this.length-1)}get(e){let t=Gx(this._lContainer);return t!==null&&t[e]||null}get length(){return this._lContainer.length-Lt}createEmbeddedView(e,t,i){let r,s,o;typeof i=="number"?r=i:i!=null&&(r=i.index,s=i.injector,o=i.onError);let a=hg(this._lContainer,e.ssrId),c=e.createEmbeddedViewImpl(t||{},s,a);return o&&(c._lView[_c]=o),this.insertImpl(c,r,Ic(this._hostTNode,a)),c}createComponent(e,t,i,r,s,o,a){let c,l,u=t||{};c=u.index,i=u.injector,r=u.projectableNodes,s=u.environmentInjector||u.ngModuleRef,o=u.directives,a=u.bindings,l=u.onError;let d=new Nc(Bs(e)),f=i||this.parentInjector;if(!s&&d.ngModule==null){let S=this.parentInjector.get(nn,null);S&&(s=S)}let h=Bs(d.componentType??{}),g=hg(this._lContainer,h?.id??null),x=g?.firstChild??null,p=d.create(f,r,x,s,o,a,this._getHostElementNamespace());return l&&(p.hostView._lView[_c]=l),this.insertImpl(p.hostView,c,Ic(this._hostTNode,g)),p}_getHostElementNamespace(){if(this._hostTNode.type&2){let e=this._hostTNode.parent??this._hostLView[On];return e!==null&&e.type&2&&typeof e.value=="string"&&e.value.toLowerCase()==="foreignobject"?null:e?.namespace??null}return this._hostTNode.namespace}insert(e,t){return this.insertImpl(e,t,!0)}insertImpl(e,t,i){let r=e._lView;if(q0(r)){let a=this.indexOf(e);if(a!==-1)this.detach(a);else{let c=r[Ft],l=new n(c,c[On],c[Ft]);l.detach(l.indexOf(e))}}let s=this._adjustIndex(t),o=this._lContainer;return Rd(o,r,s,i),e.attachToViewContainerRef(),mm(Jm(o),s,e),e}move(e,t){return this.insert(e,t)}indexOf(e){let t=Gx(this._lContainer);return t!==null?t.indexOf(e):-1}remove(e){let t=this._adjustIndex(e,-1),i=Rc(this._lContainer,t);i&&(mc(Jm(this._lContainer),t),Td(i[Le],i))}detach(e){let t=this._adjustIndex(e,-1),i=Rc(this._lContainer,t);return i&&mc(Jm(this._lContainer),t)!=null?new Kr(i):null}_adjustIndex(e,t=0){return e??this.length+t}};function Gx(n){return n[xc]}function Jm(n){return n[xc]||(n[xc]=[])}function gE(n,e){let t,i=e[n.index];return ni(i)?t=i:(t=iE(i,e,null,n),e[n.index]=t,$g(e,t)),fA(t,e,n,i),new mg(t,n,e)}function dA(n,e){let t=n[Ht],i=t.createComment(""),r=pi(e,n),s=t.parentNode(r);return qs(t,s,i,t.nextSibling(r),!1),i}var fA=mA,hA=()=>!1;function pA(n,e,t){return hA(n,e,t)}function mA(n,e,t,i){if(n[Gs])return;let r;t.type&8?r=mn(i):r=dA(e,t),n[Gs]=r}var gg=class n{queryList;matches=null;constructor(e){this.queryList=e}clone(){return new n(this.queryList)}setDirty(){this.queryList.setDirty()}},vg=class n{queries;constructor(e=[]){this.queries=e}createEmbeddedView(e){let t=e.queries;if(t!==null){let i=e.contentQueries!==null?e.contentQueries[0]:t.length,r=[];for(let s=0;s<i;s++){let o=t.getByIndex(s),a=this.queries[o.indexInDeclarationView];r.push(a.clone())}return new n(r)}return null}insertView(e){this.dirtyQueriesWithMatches(e)}detachView(e){this.dirtyQueriesWithMatches(e)}finishViewCreation(e){this.dirtyQueriesWithMatches(e)}dirtyQueriesWithMatches(e){for(let t=0;t<this.queries.length;t++)_E(e,t).matches!==null&&this.queries[t].setDirty()}},yg=class{flags;read;predicate;constructor(e,t,i=null){this.flags=t,this.read=i,typeof e=="string"?this.predicate=EA(e):this.predicate=e}},_g=class n{queries;constructor(e=[]){this.queries=e}elementStart(e,t){for(let i=0;i<this.queries.length;i++)this.queries[i].elementStart(e,t)}elementEnd(e){for(let t=0;t<this.queries.length;t++)this.queries[t].elementEnd(e)}embeddedTView(e){let t=null;for(let i=0;i<this.length;i++){let r=t!==null?t.length:0,s=this.getByIndex(i).embeddedTView(e,r);s&&(s.indexInDeclarationView=i,t!==null?t.push(s):t=[s])}return t!==null?new n(t):null}template(e,t){for(let i=0;i<this.queries.length;i++)this.queries[i].template(e,t)}getByIndex(e){return this.queries[e]}get length(){return this.queries.length}track(e){this.queries.push(e)}},xg=class n{metadata;matches=null;indexInDeclarationView=-1;crossesNgTemplate=!1;_declarationNodeIndex;_appliesToNextNode=!0;constructor(e,t=-1){this.metadata=e,this._declarationNodeIndex=t}elementStart(e,t){this.isApplyingToNode(t)&&this.matchTNode(e,t)}elementEnd(e){this._declarationNodeIndex===e.index&&(this._appliesToNextNode=!1)}template(e,t){this.elementStart(e,t)}embeddedTView(e,t){return this.isApplyingToNode(e)?(this.crossesNgTemplate=!0,this.addMatch(-e.index,t),new n(this.metadata)):null}isApplyingToNode(e){if(this._appliesToNextNode&&(this.metadata.flags&1)!==1){let t=this._declarationNodeIndex,i=e.parent;for(;i!==null&&i.type&8&&i.index!==t;)i=i.parent;return t===(i!==null?i.index:-1)}return this._appliesToNextNode}matchTNode(e,t){let i=this.metadata.predicate;if(Array.isArray(i))for(let r=0;r<i.length;r++){let s=i[r];this.matchTNodeWithReadOption(e,t,gA(t,s)),this.matchTNodeWithReadOption(e,t,ad(t,e,s,!1,!1))}else i===Ko?t.type&4&&this.matchTNodeWithReadOption(e,t,-1):this.matchTNodeWithReadOption(e,t,ad(t,e,i,!1,!1))}matchTNodeWithReadOption(e,t,i){if(i!==null){let r=this.metadata.read;if(r!==null)if(r===ta||r===Qs||r===fi||r===Ko&&t.type&4)this.addMatch(t.index,-2);else{let s=ad(t,e,r,!1,!1);s!==null&&this.addMatch(t.index,s)}else this.addMatch(t.index,i)}}addMatch(e,t){this.matches===null?this.matches=[e,t]:this.matches.push(e,t)}};function gA(n,e){let t=n.localNames;if(t!==null){for(let i=0;i<t.length;i+=2)if(t[i]===e)return t[i+1]}return null}function vA(n,e){return n.type&11?ea(n,e):n.type&4?Zg(n,e):null}function yA(n,e,t,i){return t===-1?vA(e,n):t===-2?_A(n,e,i):fd(n,n[Le],t,e)}function _A(n,e,t){if(t===ta)return ea(e,n);if(t===Ko)return Zg(e,n);if(t===Qs)return gE(e,n);if(t===fi)return new yr(e,n)}function vE(n,e,t,i){let r=e[Ni].queries[i];if(r.matches===null){let s=n.data,o=t.matches,a=[];for(let c=0;o!==null&&c<o.length;c+=2){let l=o[c];if(l<0)a.push(null);else{let u=s[l];a.push(yA(e,u,o[c+1],t.metadata.read))}}r.matches=a}return r.matches}function Sg(n,e,t,i){let r=n.queries.getByIndex(t),s=r.matches;if(s!==null){let o=vE(n,e,r,t);for(let a=0;a<s.length;a+=2){let c=s[a];if(c>0)i.push(o[a/2]);else{let l=s[a+1],u=e[-c];for(let d=Lt;d<u.length;d++){let f=u[d];f[$r]===f[Ft]&&Sg(f[Le],f,l,i)}if(u[js]!==null){let d=u[js];for(let f=0;f<d.length;f++){let h=d[f];Sg(h[Le],h,l,i)}}}}}return i}function yE(n,e){return n[Ni].queries[e].queryList}function xA(n,e,t){let i=new hd((t&4)===4);return Z0(n,e,i,i.destroy),(e[Ni]??=new vg).queries.push(new gg(i))-1}function SA(n,e,t){let i=ii();return i.firstCreatePass&&(MA(i,new yg(n,e,t),-1),(e&2)===2&&(i.staticViewQueries=!0)),xA(i,dt(),e)}function EA(n){return n.split(",").map(e=>e.trim())}function MA(n,e,t){n.queries===null&&(n.queries=new _g),n.queries.track(new xg(e,t))}function _E(n,e){return n.queries.getByIndex(e)}function bA(n,e){let t=n[Le],i=_E(t,e);return i.crossesNgTemplate?Sg(t,n,e,[]):vE(t,n,i,e)}function xE(n,e,t){let i,r=nc(()=>{i._dirtyCounter();let s=CA(i,n);if(e&&s===void 0)throw new Ce(-951,!1);return s});return i=r[ln],i._dirtyCounter=Xt(0),i._flatValue=void 0,r}function SE(n){return xE(!0,!1,n)}function EE(n){return xE(!0,!0,n)}function wA(n,e){let t=n[ln];t._lView=dt(),t._queryIndex=e,t._queryList=yE(t._lView,e),t._queryList.onDirty(()=>t._dirtyCounter.update(i=>i+1))}function CA(n,e){let t=n._lView,i=n._queryIndex;if(t===void 0||i===void 0||t[Ge]&4)return e?void 0:dr;let r=yE(t,i),s=bA(t,i);return r.reset(s,sD),e?r.first:r._changesDetected||n._flatValue===void 0?n._flatValue=r.toArray():n._flatValue}function Lc(n){return!!n&&typeof n.then=="function"}function ME(n){return!!n&&typeof n.subscribe=="function"}var Jo=class{},Pd=class{};var yd=class extends Jo{ngModuleType;_parent;_bootstrapComponents=[];_r3Injector;instance;destroyCbs=[];constructor(e,t,i,r=!0){super(),this.ngModuleType=e,this._parent=t;let s=I0(e);this._bootstrapComponents=yD(s.bootstrap),this._r3Injector=zm(e,t,[{provide:Jo,useValue:this},...i],fc(e),new Set(["environment"])),r&&this.resolveInjectorInitializers()}resolveInjectorInitializers(){this._r3Injector.resolveInjectorInitializers(),this.instance=this._r3Injector.get(this.ngModuleType)}get injector(){return this._r3Injector}destroy(){let e=this._r3Injector;!e.destroyed&&e.destroy(),this.destroyCbs.forEach(t=>t()),this.destroyCbs=null}onDestroy(e){this.destroyCbs.push(e)}},_d=class extends Pd{moduleType;constructor(e){super(),this.moduleType=e}create(e){return new yd(this.moduleType,e,[])}};var Pc=class extends Jo{injector;instance=null;constructor(e){super();let t=new ks([...e.providers,{provide:Jo,useValue:this}],e.parent||vc(),e.debugName,new Set(["environment"]));this.injector=t,e.runEnvironmentInitializers&&t.resolveInjectorInitializers()}destroy(){this.injector.destroy()}onDestroy(e){this.injector.onDestroy(e)}};function Fc(n,e,t=null){return new Pc({providers:n,parent:e,debugName:t,runEnvironmentInitializers:!0}).injector}var TA=(()=>{class n{_injector;cachedInjectors=new Map;constructor(t){this._injector=t}getOrCreateStandaloneInjector(t){if(!t.standalone)return null;if(!this.cachedInjectors.has(t)){let i=ym(!1,t.type),r=i.length>0?Fc([i],this._injector,""):null;this.cachedInjectors.set(t,r)}return this.cachedInjectors.get(t)}ngOnDestroy(){try{for(let t of this.cachedInjectors.values())t!==null&&t.destroy()}finally{this.cachedInjectors.clear()}}static \u0275prov=ut({token:n,providedIn:"environment",factory:()=>new n(qe(nn))})}return n})();function xr(n){return Ng(()=>{let e=bE(n),t=_t(he({},e),{decls:n.decls,vars:n.vars,template:n.template,consts:n.consts||null,ngContentSelectors:n.ngContentSelectors,onPush:n.changeDetection!==Og.Eager,directiveDefs:null,pipeDefs:null,dependencies:e.standalone&&n.dependencies||null,getStandaloneInjector:e.standalone?r=>r.get(TA).getOrCreateStandaloneInjector(t):null,getExternalStyles:null,signals:n.signals??!1,data:n.data||{},encapsulation:n.encapsulation||vi.Emulated,styles:n.styles||dr,_:null,schemas:n.schemas||null,tView:null,id:""});e.standalone&&Ks("NgStandalone"),wE(t);let i=n.dependencies;return t.directiveDefs=jx(i,DA),t.pipeDefs=jx(i,A0),t.id=RA(t),t})}function DA(n){return Bs(n)||Uu(n)}function IA(n,e){if(n==null)return Vs;let t={};for(let i in n)if(Object.hasOwn(n,i)){let r=n[i],s,o,a,c;Array.isArray(r)?(a=r[0],s=r[1],o=r[2]??s,c=r[3]||null):(s=r,o=r,a=Id.None,c=null),t[s]=[i,a,c],e[s]=o}return t}function AA(n){if(n==null)return Vs;let e={};for(let t in n)Object.hasOwn(n,t)&&(e[n[t]]=t);return e}function Od(n){return Ng(()=>{let e=bE(n);return wE(e),e})}function bE(n){let e={};return{type:n.type,providersResolver:null,viewProvidersResolver:null,factory:null,hostBindings:n.hostBindings||null,hostVars:n.hostVars||0,hostAttrs:n.hostAttrs||null,contentQueries:n.contentQueries||null,declaredInputs:e,inputConfig:n.inputs||Vs,exportAs:n.exportAs||null,standalone:n.standalone??!0,signals:n.signals===!0,selectors:n.selectors||dr,viewQuery:n.viewQuery||null,features:n.features||null,setInput:null,resolveHostDirectives:null,hostDirectives:null,controlDef:null,signalFormsInputPresence:null,inputs:IA(n.inputs,e),outputs:AA(n.outputs),debugInfo:null}}function wE(n){n.features?.forEach(e=>e(n))}function jx(n,e){return n?()=>{let t=typeof n=="function"?n():n,i=[];for(let r of t){let s=e(r);s!==null&&i.push(s)}return i}:null}function RA(n){let e=0,t=typeof n.consts=="function"?"":n.consts,i=[n.selectors,n.ngContentSelectors,n.hostVars,n.hostAttrs,t,n.vars,n.decls,n.encapsulation,n.standalone,n.signals,n.exportAs,JSON.stringify(n.inputs),JSON.stringify(n.outputs),Object.getOwnPropertyNames(n.type.prototype),!!n.contentQueries,!!n.viewQuery];for(let s of i.join("|"))e=Math.imul(31,e)+s.charCodeAt(0)<<0;return e+=2147483648,"c"+e}var CE=new Pe("");var Jg=(()=>{class n{resolve;reject;initialized=!1;done=!1;donePromise=new Promise((t,i)=>{this.resolve=t,this.reject=i});appInits=re(CE,{optional:!0})??[];injector=re(fi);constructor(){}runInitializers(){if(this.initialized)return;let t=[];for(let r of this.appInits){let s=hn(this.injector,r);if(Lc(s))t.push(s);else if(ME(s)){let o=new Promise((a,c)=>{s.subscribe({complete:a,error:c})});t.push(o)}}let i=()=>{this.done=!0,this.resolve()};Promise.all(t).then(()=>{i()}).catch(r=>{this.reject(r)}),t.length===0&&i(),this.initialized=!0}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function NA(n,e,t,i,r,s,o,a){if(t.firstCreatePass){n.mergedAttrs=Cd(n.mergedAttrs,n.attrs);let u=n.tView=jg(2,n,r,s,o,t.directiveRegistry,t.pipeRegistry,null,t.schemas,t.consts,null);t.queries!==null&&(t.queries.template(t,n),u.queries=t.queries.embeddedTView(n))}a&&(n.flags|=a),Wo(n,!1);let c=PA(t,e,n,i);ed()&&zg(t,e,c,n),Zo(c,e);let l=iE(c,e,c,n);e[i+pn]=l,$g(e,l),pA(l,n,e)}function xd(n,e,t,i,r,s,o,a,c,l,u){let d=t+pn,f;if(e.firstCreatePass){if(f=Nd(e,d,4,o||null,a||null),l!=null){let h=Oi(e.consts,l);f.localNames=[];for(let g=0;g<h.length;g+=2)f.localNames.push(h[g],-1)}}else f=e.data[d];return NA(f,n,e,t,i,r,s,c),l!=null&&qg(n,f,u),f}var PA=OA;function OA(n,e,t,i){return td(!0),e[Ht].createComment("")}var Qg=(()=>{class n{log(t){console.log(t)}warn(t){console.warn(t)}static \u0275fac=function(i){return new(i||n)};static \u0275prov=ut({token:n,factory:n.\u0275fac,providedIn:"platform"})}return n})();var ev=new Pe("");var Ld=new Pe("");function TE(){Ip(n=>{let e="";throw new Ce(-600,e)})}var LA=10;var na=(()=>{class n{_runningTick=!1;_destroyed=!1;_destroyListeners=[];_views=[];internalErrorHandler=re(ki);afterRenderManager=re(OS);zonelessEnabled=re(wc);rootEffectScheduler=re(Xm);dirtyFlags=0;tracingSnapshot=null;allTestViews=new Set;autoDetectTestViews=new Set;includeAllTestViews=!1;afterTick=new Bt;get allViews(){return[...(this.includeAllTestViews?this.allTestViews:this.autoDetectTestViews).keys(),...this._views]}get destroyed(){return this._destroyed}componentTypes=[];components=[];internalPendingTask=re(Zr);get isStable(){return this.internalPendingTask.hasPendingTasksObservable.pipe(Pt(t=>!t))}constructor(){re(Zs,{optional:!0})}whenStable(){let t;return new Promise(i=>{t=this.isStable.subscribe({next:r=>{r&&i()}})}).finally(()=>{t.unsubscribe()})}_injector=re(nn);_rendererFactory=null;get injector(){return this._injector}bootstrap(t,i){return this.bootstrapImpl(t,i)}bootstrapImpl(t,i,r=fi.NULL){return this._injector.get(Pn).run(()=>{if(St(ft.BootstrapComponentStart),!this._injector.get(Jg).done){let m="";throw new Ce(405,m)}let a=Bs(t),c=this._injector.get(Jo),l=new Nc(a,c);this.componentTypes.push(t);let{hostElement:u,directives:d,bindings:f}=FA(i),h=u||l.selector,g=l.create(r,[],h,c.injector,d,f),x=g.location.nativeElement,p=g.injector.get(ev,null);return p?.registerApplication(x),g.onDestroy(()=>{this.detachView(g.hostView),Tc(this.components,g),p?.unregisterApplication(x)}),this._loadComponent(g),St(ft.BootstrapComponentEnd,g),g})}tick(){this.zonelessEnabled||(this.dirtyFlags|=1),this._tick()}_tick(){St(ft.ChangeDetectionStart),this.tracingSnapshot!==null?this.tracingSnapshot.run(Vg.CHANGE_DETECTION,this.tickImpl):this.tickImpl()}tickImpl=()=>{if(this._runningTick)throw St(ft.ChangeDetectionEnd),new Ce(101,!1);let t=De(null);try{this._runningTick=!0,this.synchronize()}finally{this._runningTick=!1,this.tracingSnapshot?.dispose(),this.tracingSnapshot=null,De(t),this.afterTick.next(),St(ft.ChangeDetectionEnd)}};synchronize(){this._rendererFactory===null&&!this._injector.destroyed&&(this._rendererFactory=this._injector.get(Xs,null,{optional:!0}));let t=0;for(;this.dirtyFlags!==0&&t++<LA;){St(ft.ChangeDetectionSyncStart);try{this.synchronizeOnce()}finally{St(ft.ChangeDetectionSyncEnd)}}}synchronizeOnce(){this.dirtyFlags&16&&(this.dirtyFlags&=-17,this.rootEffectScheduler.flush());let t=!1;if(this.dirtyFlags&7){let i=!!(this.dirtyFlags&1);this.dirtyFlags&=-8,this.dirtyFlags|=8;for(let{_lView:r}of this.allViews){if(!i&&!Sc(r))continue;let s=i&&!this.zonelessEnabled?0:1;JS(r,s),t=!0}if(this.dirtyFlags&=-5,this.syncDirtyFlagsWithViews(),this.dirtyFlags&23)return}t||(this._rendererFactory?.begin?.(),this._rendererFactory?.end?.()),this.dirtyFlags&8&&(this.dirtyFlags&=-9,this.afterRenderManager.execute()),this.syncDirtyFlagsWithViews()}syncDirtyFlagsWithViews(){if(this.allViews.some(({_lView:t})=>Sc(t))){this.dirtyFlags|=2;return}else this.dirtyFlags&=-8}attachView(t){let i=t;this._views.push(i),i.attachToAppRef(this)}detachView(t){let i=t;Tc(this._views,i),i.detachFromAppRef()}_loadComponent(t){this.attachView(t.hostView);try{this.tick()}catch(r){this.internalErrorHandler(r)}this.components.push(t),this._injector.get(Ld,[]).forEach(r=>r(t))}ngOnDestroy(){if(!this._destroyed)try{this._destroyListeners.forEach(t=>t()),this._views.slice().forEach(t=>t.destroy())}finally{this._destroyed=!0,this._views=[],this._destroyListeners=[]}}onDestroy(t){return this._destroyListeners.push(t),()=>Tc(this._destroyListeners,t)}destroy(){if(this._destroyed)throw new Ce(406,!1);let t=this._injector;t.destroy&&!t.destroyed&&t.destroy()}get viewCount(){return this._views.length}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function FA(n){return n===void 0||typeof n=="string"||n instanceof Element?{hostElement:n}:n}function Tc(n,e){let t=n.indexOf(e);t>-1&&n.splice(t,1)}function eo(n,e,t,i){let r=dt(),s=$o();if(Jr(r,s,e)){let o=ii(),a=Vm();oI(a,r,n,e,t,i)}return eo}var Eg=class{destroy(e){}updateValue(e,t){}swap(e,t){let i=Math.min(e,t),r=Math.max(e,t),s=this.detach(r);if(r-i>1){let o=this.detach(i);this.attach(i,s),this.attach(r,o)}else this.attach(i,s)}move(e,t){this.attach(t,this.detach(e))}};function Qm(n,e,t,i,r){return n===t&&Object.is(e,i)?1:Object.is(r(n,e),r(t,i))?-1:0}function kA(n,e,t,i){let r,s,o=0,a=n.length-1,c=void 0;if(Array.isArray(e)){De(i);let l=e.length-1;for(De(null);o<=a&&o<=l;){let u=n.at(o),d=e[o],f=Qm(o,u,o,d,t);if(f!==0){f<0&&n.updateValue(o,d),o++;continue}let h=n.at(a),g=e[l],x=Qm(a,h,l,g,t);if(x!==0){x<0&&n.updateValue(a,g),a--,l--;continue}let p=t(o,u),m=t(a,h),S=t(o,d);if(Object.is(S,m)){let C=t(l,g);Object.is(C,p)?(n.swap(o,a),n.updateValue(a,g),l--,a--):n.move(a,o),n.updateValue(o,d),o++;continue}if(r??=new Sd,s??=$x(n,o,a,t),Mg(n,r,o,S))n.updateValue(o,d),o++,a++;else if(s.has(S))r.set(p,n.detach(o)),a--;else{let C=n.create(o,e[o]);n.attach(o,C),o++,a++}}for(;o<=l;)Wx(n,r,t,o,e[o]),o++}else if(e!=null){De(i);let l=e[Symbol.iterator]();De(null);let u=l.next();for(;!u.done&&o<=a;){let d=n.at(o),f=u.value,h=Qm(o,d,o,f,t);if(h!==0)h<0&&n.updateValue(o,f),o++,u=l.next();else{r??=new Sd,s??=$x(n,o,a,t);let g=t(o,f);if(Mg(n,r,o,g))n.updateValue(o,f),o++,a++,u=l.next();else if(!s.has(g))n.attach(o,n.create(o,f)),o++,a++,u=l.next();else{let x=t(o,d);r.set(x,n.detach(o)),a--}}}for(;!u.done;)Wx(n,r,t,n.length,u.value),u=l.next()}for(;o<=a;)n.destroy(n.detach(a--));r?.forEach(l=>{n.destroy(l)})}function Mg(n,e,t,i){return e!==void 0&&e.has(i)?(n.attach(t,e.get(i)),e.delete(i),!0):!1}function Wx(n,e,t,i,r){if(Mg(n,e,i,t(i,r)))n.updateValue(i,r);else{let s=n.create(i,r);n.attach(i,s)}}function $x(n,e,t,i){let r=new Set;for(let s=e;s<=t;s++)r.add(i(s,n.at(s)));return r}var Sd=class{kvMap=new Map;_vMap=void 0;has(e){return this.kvMap.has(e)}delete(e){if(!this.has(e))return!1;let t=this.kvMap.get(e);return this._vMap!==void 0&&this._vMap.has(t)?(this.kvMap.set(e,this._vMap.get(t)),this._vMap.delete(t)):this.kvMap.delete(e),!0}get(e){return this.kvMap.get(e)}set(e,t){if(this.kvMap.has(e)){let i=this.kvMap.get(e);this._vMap===void 0&&(this._vMap=new Map);let r=this._vMap;for(;r.has(i);)i=r.get(i);r.set(i,t)}else this.kvMap.set(e,t)}forEach(e){for(let[t,i]of this.kvMap)if(e(i,t),this._vMap!==void 0){let r=this._vMap;for(;r.has(i);)i=r.get(i),e(i,t)}}};function Bi(n,e,t,i,r,s,o,a){Ks("NgControlFlow");let c=dt(),l=ii(),u=Oi(l.consts,s);return xd(c,l,n,e,t,i,r,u,256,o,a),tv}function tv(n,e,t,i,r,s,o,a){return Ks("NgControlFlow"),UA(n,e,t,i,r,s,o,a),tv}function UA(n,e,t,i,r,s,o,a){let c=dt(),l=ii(),u=Oi(l.consts,s);xd(c,l,n,e,t,i,r,u,512,o,a)}function Vi(n,e){Ks("NgControlFlow");let t=dt(),i=$o(),r=t[i]!==ri?t[i]:-1,s=r!==-1?Ed(t,pn+r):void 0,o=0;if(Jr(t,i,n)){let a=De(null);try{if(s!==void 0&&sE(s,o),n!==-1){let c=pn+n,l=Ed(t,c),u=Tg(t[Le],c),d=aE(l,u,t),f=Ad(t,u,e,{dehydratedView:d});Rd(l,f,o,Ic(u,d))}}finally{De(a)}}else if(s!==void 0){let a=rE(s,o);a!==void 0&&(a[Ot]=e)}}var bg=class{lContainer;$implicit;$index;constructor(e,t,i){this.lContainer=e,this.$implicit=t,this.$index=i}get $count(){return this.lContainer.length-Lt}};function Fd(n){return n}function nv(n,e){return e}var wg=class{hasEmptyBlock;trackByFn;liveCollection;constructor(e,t,i){this.hasEmptyBlock=e,this.trackByFn=t,this.liveCollection=i}};function Qr(n,e,t,i,r,s,o,a,c,l,u,d,f){Ks("NgControlFlow");let h=dt(),g=ii(),x=c!==void 0,p=dt(),m=a?o.bind(p[Ln][Ot]):o,S=new wg(x,m);p[pn+n]=S,xd(h,g,n+1,e,t,i,r,Oi(g.consts,s),256),x&&xd(h,g,n+2,c,l,u,d,Oi(g.consts,f),512)}var Cg=class extends Eg{lContainer;hostLView;templateTNode;operationsCounter=void 0;needsIndexUpdate=!1;constructor(e,t,i){super(),this.lContainer=e,this.hostLView=t,this.templateTNode=i}get length(){return this.lContainer.length-Lt}at(e){return this.getLView(e)[Ot].$implicit}attach(e,t){let i=t[Vo];this.needsIndexUpdate||=e!==this.length,Rd(this.lContainer,t,e,Ic(this.templateTNode,i)),BA(this.lContainer,e)}detach(e){return this.needsIndexUpdate||=e!==this.length-1,VA(this.lContainer,e),HA(this.lContainer,e)}create(e,t){let i=hg(this.lContainer,this.templateTNode.tView.ssrId);return Ad(this.hostLView,this.templateTNode,new bg(this.lContainer,t,e),{dehydratedView:i})}destroy(e){Td(e[Le],e)}updateValue(e,t){this.getLView(e)[Ot].$implicit=t}reset(){this.needsIndexUpdate=!1}updateIndexes(){if(this.needsIndexUpdate)for(let e=0;e<this.length;e++)this.getLView(e)[Ot].$index=e}getLView(e){return zA(this.lContainer,e)}};function es(n){let e=De(null),t=mr();try{let i=dt(),r=i[Le],s=i[t],o=t+1,a=Ed(i,o);if(s.liveCollection===void 0){let l=Tg(r,o);s.liveCollection=new Cg(a,i,l)}else s.liveCollection.reset();let c=s.liveCollection;if(kA(c,n,s.trackByFn,e),c.updateIndexes(),s.hasEmptyBlock){let l=$o(),u=c.length===0;if(Jr(i,l,u)){let d=t+2,f=Ed(i,d);if(u){let h=Tg(r,d),g=aE(f,h,i),x=Ad(i,h,void 0,{dehydratedView:g});Rd(f,x,0,Ic(h,g))}else r.firstUpdatePass&&AI(f),sE(f,0)}}}finally{De(e)}}function Ed(n,e){return n[e]}function BA(n,e){if(n.length<=Lt)return;let t=Lt+e,i=n[t];i&&OD(i)}function VA(n,e){if(n.length<=Lt)return;let t=Lt+e,i=n[t];i&&PD(i)}function HA(n,e){return Rc(n,e)}function zA(n,e){return rE(n,e)}function Tg(n,e){return $u(n,e)}function qx(n,e,t,i,r){$S(e,n,t,r?"class":"style",i)}function Md(n,e,t,i){let r=dt(),s=r[Le],o=n+pn,a=s.firstCreatePass?fE(o,r,2,e,sI,Q0(),t,i):s.data[o];if(Xr(a)){let c=r[Ri].tracingService;if(c&&c.componentCreate){let l=s.data[a.directiveStart+a.componentOffset];return c.componentCreate(uE(l),()=>(Xx(n,e,r,a,i),Md))}}return Xx(n,e,r,a,i),Md}function Xx(n,e,t,i,r){if(jS(i,t,n,e,DE),Wu(i)){let s=t[Le];zS(s,t,i),TS(s,i,t)}r!=null&&qg(t,i)}function iv(){let n=ii(),e=mi(),t=WS(e);return n.firstCreatePass&&hE(n,t),Rm(t)&&Nm(),Am(),t.classesWithoutHost!=null&&jT(t)&&qx(n,t,dt(),t.classesWithoutHost,!0),t.stylesWithoutHost!=null&&WT(t)&&qx(n,t,dt(),t.stylesWithoutHost,!1),iv}function ia(n,e,t,i){return Md(n,e,t,i),iv(),ia}function Ie(n,e,t,i){let r=dt(),s=r[Le],o=n+pn,a=s.firstCreatePass?JI(o,s,2,e,t,i):s.data[o];return jS(a,r,n,e,DE),i!=null&&qg(r,a),Ie}function ke(){let n=mi(),e=WS(n);return Rm(e)&&Nm(),Am(),ke}function yi(n,e,t,i){return Ie(n,e,t,i),ke(),yi}var DE=(n,e,t,i,r)=>(td(!0),DS(e[Ht],i,Hm()));function ts(){return dt()}function to(n,e,t){let i=dt(),r=$o();if(Jr(i,r,e)){let s=ii(),o=Vm();tI(o,i,n,e,i[Ht],t)}return to}var kc="en-US";var GA=kc;function IE(n){typeof n=="string"&&(GA=n.toLowerCase().replace(/_/g,"-"))}function Hn(n,e,t){let i=dt(),r=ii(),s=mi();return(s.type&3||t)&&UI(s,r,i,t,i[Ht],n,e,kI(s,i,e)),Hn}function Gt(n=1){return px(n)}function kd(n,e,t,i){return wA(n,SA(e,t,i)),kd}function rv(n=1){Ku(ux()+n)}function rd(n,e){return n<<17|e<<2}function Ys(n){return n>>17&32767}function jA(n){return(n&2)==2}function WA(n,e){return n&131071|e<<17}function Dg(n){return n|2}function Qo(n){return(n&131068)>>2}function eg(n,e){return n&-131069|e<<2}function $A(n){return(n&1)===1}function Ig(n){return n|1}function qA(n,e,t,i,r,s){let o=s?e.classBindings:e.styleBindings,a=Ys(o),c=Qo(o);n[i]=t;let l=!1,u;if(Array.isArray(t)){let d=t;u=d[1],(u===null||Uo(d,u)>0)&&(l=!0)}else u=t;if(r)if(c!==0){let f=Ys(n[a+1]);n[i+1]=rd(f,a),f!==0&&(n[f+1]=eg(n[f+1],i)),n[a+1]=WA(n[a+1],i)}else n[i+1]=rd(a,0),a!==0&&(n[a+1]=eg(n[a+1],i)),a=i;else n[i+1]=rd(c,0),a===0?a=i:n[c+1]=eg(n[c+1],i),c=i;l&&(n[i+1]=Dg(n[i+1])),Yx(n,u,i,!0),Yx(n,u,i,!1),XA(e,u,n,i,s),o=rd(a,c),s?e.classBindings=o:e.styleBindings=o}function XA(n,e,t,i,r){let s=r?n.residualClasses:n.residualStyles;s!=null&&typeof e=="string"&&Uo(s,e)>=0&&(t[i+1]=Ig(t[i+1]))}function Yx(n,e,t,i){let r=n[t+1],s=e===null,o=i?Ys(r):Qo(r),a=!1;for(;o!==0&&(a===!1||s);){let c=n[o],l=n[o+1];YA(c,e)&&(a=!0,n[o+1]=i?Ig(l):Dg(l)),o=i?Ys(l):Qo(l)}a&&(n[t+1]=i?Dg(r):Ig(r))}function YA(n,e){return n===null||e==null||(Array.isArray(n)?n[1]:n)===e?!0:Array.isArray(n)&&typeof e=="string"?Uo(n,e)>=0:!1}function no(n,e,t){return AE(n,e,t,!1),no}function ns(n,e){return AE(n,e,null,!0),ns}function AE(n,e,t,i){let r=dt(),s=ii(),o=km(2);if(s.firstUpdatePass&&KA(s,n,o,i),e!==ri&&Jr(r,o,e)){let a=s.data[mr()];nR(s,a,r,r[Ht],n,r[o+1]=iR(e,t),i,o)}}function ZA(n,e){return e>=n.expandoStartIndex}function KA(n,e,t,i){let r=n.data;if(r[t+1]===null){let s=r[mr()],o=ZA(n,t);rR(s,i)&&e===null&&!o&&(e=!1),e=JA(r,s,e,i),qA(r,s,e,t,o,i)}}function JA(n,e,t,i){let r=lx(n),s=i?e.residualClasses:e.residualStyles;if(r===null)(i?e.classBindings:e.styleBindings)===0&&(t=tg(null,n,e,t,i),t=Oc(t,e.attrs,i),s=null);else{let o=e.directiveStylingLast;if(o===-1||n[o]!==r)if(t=tg(r,n,e,t,i),s===null){let c=QA(n,e,i);c!==void 0&&Array.isArray(c)&&(c=tg(null,n,e,c[1],i),c=Oc(c,e.attrs,i),eR(n,e,i,c))}else s=tR(n,e,i)}return s!==void 0&&(i?e.residualClasses=s:e.residualStyles=s),t}function QA(n,e,t){let i=t?e.classBindings:e.styleBindings;if(Qo(i)!==0)return n[Ys(i)]}function eR(n,e,t,i){let r=t?e.classBindings:e.styleBindings;n[Ys(r)]=i}function tR(n,e,t){let i,r=e.directiveEnd;for(let s=1+e.directiveStylingLast;s<r;s++){let o=n[s].hostAttrs;i=Oc(i,o,t)}return Oc(i,e.attrs,t)}function tg(n,e,t,i,r){let s=null,o=t.directiveEnd,a=t.directiveStylingLast;for(a===-1?a=t.directiveStart:a++;a<o&&(s=e[a],i=Oc(i,s.hostAttrs,r),s!==n);)a++;return n!==null&&(t.directiveStylingLast=a),i}function Oc(n,e,t){let i=t?1:2,r=-1;if(e!==null)for(let s=0;s<e.length;s++){let o=e[s];typeof o=="number"?r=o:r===i&&(Array.isArray(n)||(n=n===void 0?[]:["",n]),k0(n,o,t?!0:e[++s]))}return n===void 0?null:n}function nR(n,e,t,i,r,s,o,a){if(!(e.type&3))return;let c=n.data,l=c[a+1],u=$A(l)?Zx(c,e,t,r,Qo(l),o):void 0;if(!bd(u)){bd(s)||jA(l)&&(s=Zx(c,null,t,r,a,o));let d=wm(mr(),t);XD(i,o,d,r,s)}}function Zx(n,e,t,i,r,s){let o=e===null,a;for(;r>0;){let c=n[r],l=Array.isArray(c),u=l?c[1]:c,d=u===null,f=t[r+1];f===ri&&(f=d?dr:void 0);let h=d?zu(f,i):u===i?f:void 0;if(l&&!bd(h)&&(h=zu(c,i)),bd(h)&&(a=h,o))return a;let g=n[r+1];r=o?Ys(g):Qo(g)}if(e!==null){let c=s?e.residualClasses:e.residualStyles;c!=null&&(a=zu(c,i))}return a}function bd(n){return n!==void 0}function iR(n,e){return n==null||n===""||(typeof e=="string"?n=pd(n)+e:typeof n=="object"&&(n=fc(pd(n)))),n}function rR(n,e){return(n.flags&(e?8:16))!==0}function Je(n,e=""){let t=dt(),i=ii(),r=n+pn,s=i.firstCreatePass?Nd(i,r,1,e,null):i.data[r],o=sR(i,t,s,e);t[r]=o,ed()&&zg(i,t,o,s),Wo(s,!1)}var sR=(n,e,t,i)=>(td(!0),pD(e[Ht],i));function oR(n,e,t,i=""){return Jr(n,$o(),t)?e+pc(t)+i:ri}function aR(n,e,t,i,r,s=""){let o=rx(),a=FI(n,o,t,r);return km(2),a?e+pc(t)+i+pc(r)+s:ri}function gn(n){return Sr("",n),gn}function Sr(n,e,t){let i=dt(),r=oR(i,n,e,t);return r!==ri&&RE(i,mr(),r),Sr}function ra(n,e,t,i,r){let s=dt(),o=aR(s,n,e,t,i,r);return o!==ri&&RE(s,mr(),o),ra}function RE(n,e,t){let i=wm(e,n);mD(n[Ht],i,t)}function sv(n,e){let t=ix()+n,i=dt();return i[t]===ri?OI(i,t,e()):LI(i,t)}var NE=(()=>{class n{applicationErrorHandler=re(ki);appRef=re(na);taskService=re(Zr);ngZone=re(Pn);zonelessEnabled=re(wc);tracing=re(Zs,{optional:!0});zoneIsDefined=typeof Zone<"u"&&!!Zone.root.run;schedulerTickApplyArgs=[{data:{__scheduler_tick__:!0}}];subscriptions=new un;angularZoneId=this.zoneIsDefined?this.ngZone._inner?.get(lc):null;scheduleInRootZone=!this.zonelessEnabled&&this.zoneIsDefined&&(re(qm,{optional:!0})??!1);cancelScheduledCallback=null;useMicrotaskScheduler=!1;runningTick=!1;pendingRenderTaskId=null;constructor(){this.subscriptions.add(this.appRef.afterTick.subscribe(()=>{let t=this.taskService.add();if(!this.runningTick&&(this.cleanup(),!this.zonelessEnabled||this.appRef.includeAllTestViews)){this.taskService.remove(t);return}this.switchToMicrotaskScheduler(),this.taskService.remove(t)})),this.subscriptions.add(this.ngZone.onUnstable.subscribe(()=>{this.runningTick||this.cleanup()}))}switchToMicrotaskScheduler(){this.ngZone.runOutsideAngular(()=>{let t=this.taskService.add();this.useMicrotaskScheduler=!0,queueMicrotask(()=>{this.useMicrotaskScheduler=!1,this.taskService.remove(t)})})}notify(t){if(!this.zonelessEnabled&&t===5)return;switch(t){case 0:case 2:{this.appRef.dirtyFlags|=2;break}case 3:case 4:case 5:case 1:{this.appRef.dirtyFlags|=4;break}case 6:{this.appRef.dirtyFlags|=2;break}case 12:{this.appRef.dirtyFlags|=16;break}case 13:{this.appRef.dirtyFlags|=2;break}case 11:break;default:this.appRef.dirtyFlags|=8}if(this.appRef.tracingSnapshot=this.tracing?.snapshot(this.appRef.tracingSnapshot)??null,!this.shouldScheduleTick())return;let i=this.useMicrotaskScheduler?yx:Gm;this.pendingRenderTaskId=this.taskService.add(),this.scheduleInRootZone?this.cancelScheduledCallback=Zone.root.run(()=>i(()=>this.tick())):this.cancelScheduledCallback=this.ngZone.runOutsideAngular(()=>i(()=>this.tick()))}shouldScheduleTick(){return!(this.appRef.destroyed||this.pendingRenderTaskId!==null||this.runningTick||this.appRef._runningTick||!this.zonelessEnabled&&this.zoneIsDefined&&Zone.current.get(lc+this.angularZoneId))}tick(){if(this.runningTick||this.appRef.destroyed)return;if(this.appRef.dirtyFlags===0){this.cleanup();return}!this.zonelessEnabled&&this.appRef.dirtyFlags&7&&(this.appRef.dirtyFlags|=1);let t=this.taskService.add();try{this.ngZone.run(()=>{this.runningTick=!0,this.appRef._tick()},void 0,this.schedulerTickApplyArgs)}catch(i){this.applicationErrorHandler(i)}finally{this.taskService.remove(t),this.cleanup()}}ngOnDestroy(){this.subscriptions.unsubscribe(),this.cleanup()}cleanup(){if(this.runningTick=!1,this.cancelScheduledCallback?.(),this.cancelScheduledCallback=null,this.pendingRenderTaskId!==null){let t=this.pendingRenderTaskId;this.pendingRenderTaskId=null,this.taskService.remove(t)}}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function PE(){return[{provide:ko,useExisting:NE},{provide:Pn,useClass:uc},{provide:wc,useValue:!0}]}var ov=(()=>{class n{compileModuleSync(t){return new _d(t)}compileModuleAsync(t){return Promise.resolve(this.compileModuleSync(t))}clearCache(){}clearCacheFor(t){}getModuleId(t){}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function cR(){return typeof $localize<"u"&&$localize.locale||kc}var av=new Pe("",{factory:()=>re(av,{optional:!0,skipSelf:!0})||cR()});function Hi(n,e){return nc(n,e?.equal)}function is(n){return q_(n)}var OE=class n extends Error{_brand;constructor(e){super(e)}static IDLE=new n("IDLE");static LOADING=new n("LOADING")};function BE(n,e){let t=Object.create(eS);t.value=n,t.transformFn=e?.transform;function i(){if(Is(t),t.value===Rg){let r=null;throw new Ce(-950,r)}return t.value}return i[ln]=t,i}function uv(n){return TR(n)?n.default:n}function TR(n){return n&&typeof n=="object"&&"default"in n}function LE(n,e){return BE(n,e)}function DR(n){return BE(Rg,n)}var dv=(LE.required=DR,LE);function FE(n,e){return SE(e)}function IR(n,e){return EE(e)}var VE=(FE.required=IR,FE);var AR=1e4;var t9=AR-1e3;var fv=(()=>{class n{static __NG_ELEMENT_ID__=RR}return n})();function RR(n){return NR(mi(),dt(),(n&16)===16)}function NR(n,e,t){if(Xr(n)&&!t){let i=Pi(n.index,e);return new Kr(i,i)}else if(n.type&175){let i=e[Ln];return new Kr(i,e)}return null}var cv=new Pe(""),PR=new Pe("");function Uc(n){return!n.moduleRef}function OR(n){let e=Uc(n)?n.r3Injector:n.moduleRef.injector,t=e.get(Pn);return t.run(()=>{Uc(n)?n.r3Injector.resolveInjectorInitializers():n.moduleRef.resolveInjectorInitializers();let i=e.get(ki),r;if(t.runOutsideAngular(()=>{r=t.onError.subscribe({next:i})}),Uc(n)){let s=()=>e.destroy(),o=n.platformInjector.get(cv);o.add(s),e.onDestroy(()=>{r.unsubscribe(),o.delete(s)})}else{let s=()=>n.moduleRef.destroy(),o=n.platformInjector.get(cv);o.add(s),n.moduleRef.onDestroy(()=>{Tc(n.allPlatformModules,n.moduleRef),r.unsubscribe(),o.delete(s)})}return FR(i,t,()=>{let s=e.get(Zr),o=s.add(),a=e.get(Jg);return a.runInitializers(),a.donePromise.then(()=>{let c=e.get(av,kc);if(IE(c||kc),!e.get(PR,!0))return Uc(n)?e.get(na):(n.allPlatformModules.push(n.moduleRef),n.moduleRef);if(Uc(n)){let u=e.get(na);return n.rootComponent!==void 0&&u.bootstrap(n.rootComponent),u}else return LR?.(n.moduleRef,n.allPlatformModules),n.moduleRef}).finally(()=>{s.remove(o)})})})}var LR;function FR(n,e,t){try{let i=t();return Lc(i)?i.catch(r=>{throw e.runOutsideAngular(()=>n(r)),r}):i}catch(i){throw e.runOutsideAngular(()=>n(i)),i}}var Ud=null;function kR(n=[],e){return fi.create({name:e,providers:[{provide:gc,useValue:"platform"},{provide:cv,useValue:new Set([()=>Ud=null])},...n]})}function UR(n=[]){if(Ud)return Ud;let e=kR(n);return Ud=e,TE(),BR(e),e}function BR(n){let e=n.get(nd,null);hn(n,()=>{e?.forEach(t=>t())})}function HE(n){let{rootComponent:e,appProviders:t,platformProviders:i,platformRef:r}=n;St(ft.BootstrapApplicationStart);try{let s=r?.injector??UR(i),o=[PE(),Sx,...t||[]],a=new Pc({providers:o,parent:s,debugName:"",runEnvironmentInitializers:!1});return OR({r3Injector:a.injector,platformInjector:s,rootComponent:e})}catch(s){return Promise.reject(s)}finally{St(ft.BootstrapApplicationEnd)}}var zE=null;function Er(){return zE}function hv(n){zE??=n}var Bc=class{},ro=(()=>{class n{historyGo(t){throw new Error("")}static \u0275fac=function(i){return new(i||n)};static \u0275prov=ut({token:n,factory:()=>re(GE),providedIn:"platform"})}return n})();var GE=(()=>{class n extends ro{_location;_history;_doc=re(zt);constructor(){super(),this._location=window.location,this._history=window.history}getBaseHrefFromDOM(){return Er().getBaseHref(this._doc)}onPopState(t){let i=Er().getGlobalEventTarget(this._doc,"window");return i.addEventListener("popstate",t,!1),()=>i.removeEventListener("popstate",t)}onHashChange(t){let i=Er().getGlobalEventTarget(this._doc,"window");return i.addEventListener("hashchange",t,!1),()=>i.removeEventListener("hashchange",t)}get href(){return this._location.href}get protocol(){return this._location.protocol}get hostname(){return this._location.hostname}get port(){return this._location.port}get pathname(){return this._location.pathname}get search(){return this._location.search}get hash(){return this._location.hash}set pathname(t){this._location.pathname=t}pushState(t,i,r){this._history.pushState(t,i,r)}replaceState(t,i,r){this._history.replaceState(t,i,r)}forward(){this._history.forward()}back(){this._history.back()}historyGo(t=0){this._history.go(t)}getState(){return this._history.state}static \u0275fac=function(i){return new(i||n)};static \u0275prov=ut({token:n,factory:()=>new n,providedIn:"platform"})}return n})();function Bd(n,e){return n?e?n.endsWith("/")?e.startsWith("/")?n+e.slice(1):n+e:e.startsWith("/")?n+e:`${n}/${e}`:n:e}function jE(n){let e=n.search(/#|\?|$/);return n[e-1]==="/"?n.slice(0,e-1)+n.slice(e):n}function _i(n){return n&&n[0]!=="?"?`?${n}`:n}var rs=(()=>{class n{historyGo(t){throw new Error("")}static \u0275fac=function(i){return new(i||n)};static \u0275prov=ut({token:n,factory:()=>re($E),providedIn:"root"})}return n})(),pv=new Pe(""),$E=(()=>{class n extends rs{_platformLocation;_baseHref;_removeListenerFns=[];constructor(t,i){super(),this._platformLocation=t,this._baseHref=i??this._platformLocation.getBaseHrefFromDOM()??re(zt).location?.origin??""}ngOnDestroy(){for(;this._removeListenerFns.length;)this._removeListenerFns.pop()()}onPopState(t){this._removeListenerFns.push(this._platformLocation.onPopState(t),this._platformLocation.onHashChange(t))}getBaseHref(){return this._baseHref}prepareExternalUrl(t){return Bd(this._baseHref,t)}path(t=!1){let i=this._platformLocation.pathname+_i(this._platformLocation.search),r=this._platformLocation.hash;return r&&t?`${i}${r}`:i}pushState(t,i,r,s){let o=this.prepareExternalUrl(r+_i(s));this._platformLocation.pushState(t,i,o)}replaceState(t,i,r,s){let o=this.prepareExternalUrl(r+_i(s));this._platformLocation.replaceState(t,i,o)}forward(){this._platformLocation.forward()}back(){this._platformLocation.back()}getState(){return this._platformLocation.getState()}historyGo(t=0){this._platformLocation.historyGo?.(t)}static \u0275fac=function(i){return new(i||n)(qe(ro),qe(pv,8))};static \u0275prov=ut({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var so=(()=>{class n{_subject=new Bt;_basePath;_locationStrategy;_urlChangeListeners=[];_urlChangeSubscription=null;constructor(t){this._locationStrategy=t;let i=this._locationStrategy.getBaseHref();this._basePath=zR(jE(WE(i))),this._locationStrategy.onPopState(r=>{let s={url:this.path(!0),pop:!0,state:r.state,type:r.type};r.hasUAVisualTransition&&(s.hasUAVisualTransition=!0),this._subject.next(s)})}ngOnDestroy(){this._urlChangeSubscription?.unsubscribe(),this._urlChangeListeners=[]}path(t=!1){return this.normalize(this._locationStrategy.path(t))}getState(){return this._locationStrategy.getState()}isCurrentPathEqualTo(t,i=""){return this.path()==this.normalize(t+_i(i))}normalize(t){return n.stripTrailingSlash(HR(this._basePath,WE(t)))}prepareExternalUrl(t){return t&&t[0]!=="/"&&(t="/"+t),this._locationStrategy.prepareExternalUrl(t)}go(t,i="",r=null){this._locationStrategy.pushState(r,"",t,i),this._notifyUrlChangeListeners(this.prepareExternalUrl(t+_i(i)),r)}replaceState(t,i="",r=null){this._locationStrategy.replaceState(r,"",t,i),this._notifyUrlChangeListeners(this.prepareExternalUrl(t+_i(i)),r)}forward(){this._locationStrategy.forward()}back(){this._locationStrategy.back()}historyGo(t=0){this._locationStrategy.historyGo?.(t)}onUrlChange(t){return this._urlChangeListeners.push(t),this._urlChangeSubscription??=this.subscribe(i=>{this._notifyUrlChangeListeners(i.url,i.state)}),()=>{let i=this._urlChangeListeners.indexOf(t);this._urlChangeListeners.splice(i,1),this._urlChangeListeners.length===0&&(this._urlChangeSubscription?.unsubscribe(),this._urlChangeSubscription=null)}}_notifyUrlChangeListeners(t="",i){this._urlChangeListeners.forEach(r=>r(t,i))}subscribe(t,i,r){return this._subject.subscribe({next:t,error:i??void 0,complete:r??void 0})}static normalizeQueryParams=_i;static joinWithSlash=Bd;static stripTrailingSlash=jE;static \u0275fac=function(i){return new(i||n)(qe(rs))};static \u0275prov=ut({token:n,factory:()=>VR(),providedIn:"root"})}return n})();function VR(){return new so(qe(rs))}function HR(n,e){if(!n||!e.startsWith(n))return e;let t=e.substring(n.length);return t===""||["/",";","?","#"].includes(t[0])?t:e}function WE(n){return n.replace(/\/index\.html$/,"")}function zR(n){if(new RegExp("^(https?:)?//").test(n)){let[,t]=n.split(/\/\/[^\/]+/);return t}return n}var mv=(()=>{class n extends rs{_platformLocation;_baseHref="";_removeListenerFns=[];constructor(t,i){super(),this._platformLocation=t,i!=null&&(this._baseHref=i)}ngOnDestroy(){for(;this._removeListenerFns.length;)this._removeListenerFns.pop()()}onPopState(t){this._removeListenerFns.push(this._platformLocation.onPopState(t),this._platformLocation.onHashChange(t))}getBaseHref(){return this._baseHref}path(t=!1){let i=this._platformLocation.hash??"#";return i.length>0?i.substring(1):i}prepareExternalUrl(t){let i=Bd(this._baseHref,t);return i.length>0?"#"+i:i}pushState(t,i,r,s){let o=this.prepareExternalUrl(r+_i(s))||this._platformLocation.pathname;this._platformLocation.pushState(t,i,o)}replaceState(t,i,r,s){let o=this.prepareExternalUrl(r+_i(s))||this._platformLocation.pathname;this._platformLocation.replaceState(t,i,o)}forward(){this._platformLocation.forward()}back(){this._platformLocation.back()}getState(){return this._platformLocation.getState()}historyGo(t=0){this._platformLocation.historyGo?.(t)}static \u0275fac=function(i){return new(i||n)(qe(ro),qe(pv,8))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})();function gv(n,e){e=encodeURIComponent(e);for(let t of n.split(";")){let i=t.indexOf("="),[r,s]=i==-1?[t,""]:[t.slice(0,i),t.slice(i+1)];if(r.trim()!==e)continue;let o=s;try{o=decodeURIComponent(s)}catch{}return o.length>1&&o[0]==='"'&&o[o.length-1]==='"'&&(o=o.slice(1,-1)),o}return null}var qE="browser";var Vc=class{_doc;constructor(e){this._doc=e}manager},Vd=(()=>{class n extends Vc{constructor(t){super(t)}supports(t){return!0}addEventListener(t,i,r,s){return t.addEventListener(i,r,s),()=>this.removeEventListener(t,i,r,s)}removeEventListener(t,i,r,s){return t.removeEventListener(i,r,s)}static \u0275fac=function(i){return new(i||n)(qe(zt))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})(),Gd=new Pe(""),xv=(()=>{class n{_zone;_plugins;_eventNameToPlugin=new Map;constructor(t,i){this._zone=i,t.forEach(o=>{o.manager=this});let r=t.filter(o=>!(o instanceof Vd));this._plugins=r.slice().reverse();let s=t.find(o=>o instanceof Vd);s&&this._plugins.push(s)}addEventListener(t,i,r,s){return this._findPluginFor(i).addEventListener(t,i,r,s)}getZone(){return this._zone}_findPluginFor(t){let i=this._eventNameToPlugin.get(t);if(i)return i;if(i=this._plugins.find(s=>s.supports(t)),!i)throw new Ce(-5101,!1);return this._eventNameToPlugin.set(t,i),i}static \u0275fac=function(i){return new(i||n)(qe(Gd),qe(Pn))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})(),vv="ng-app-id";function XE(n){for(let e of n)e.remove()}function YE(n,e){let t=e.createElement("style");return t.textContent=n,t}function $R(n,e,t,i){let r=n.head?.querySelectorAll(`style[${vv}="${e}"],link[${vv}="${e}"]`);if(!r||r.length===0)return!1;for(let s of r)s.removeAttribute(vv),s instanceof HTMLLinkElement?i.set(s.href.slice(s.href.lastIndexOf("/")+1),{usage:0,elements:[s]}):s.textContent&&t.set(s.textContent,{usage:0,elements:[s]});return!0}function _v(n,e){let t=e.createElement("link");return t.setAttribute("rel","stylesheet"),t.setAttribute("href",n),t}var Sv=(()=>{class n{doc;appId;nonce;inline=new Map;external=new Map;hosts=new Set;constructor(t,i,r,s={}){this.doc=t,this.appId=i,this.nonce=r,$R(t,i,this.inline,this.external)&&this.hosts.add(t.head)}addStyles(t,i){for(let r of t)this.addUsage(r,this.inline,YE);i?.forEach(r=>this.addUsage(r,this.external,_v))}removeStyles(t,i){for(let r of t)this.removeUsage(r,this.inline);i?.forEach(r=>this.removeUsage(r,this.external))}addUsage(t,i,r){let s=i.get(t);s?s.usage++:i.set(t,{usage:1,elements:[...this.hosts].map(o=>this.addElement(o,r(t,this.doc)))})}removeUsage(t,i){let r=i.get(t);r&&(r.usage--,r.usage<=0&&(XE(r.elements),i.delete(t)))}ngOnDestroy(){for(let[,{elements:t}]of[...this.inline,...this.external])XE(t);this.hosts.clear()}addHost(t){if(!this.hosts.has(t)){this.hosts.add(t);for(let[i,{elements:r}]of this.inline)r.push(this.addElement(t,YE(i,this.doc)));for(let[i,{elements:r}]of this.external)r.push(this.addElement(t,_v(i,this.doc)))}}removeHost(t){this.hosts.delete(t);for(let i of[...this.inline.values(),...this.external.values()]){let r=[];for(let s of i.elements)s.parentNode===t?s.remove():r.push(s);i.elements=r}}addElement(t,i){return this.nonce&&i.setAttribute("nonce",this.nonce),t.appendChild(i)}static \u0275fac=function(i){return new(i||n)(qe(zt),qe(Mc),qe(id,8),qe(bc))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})(),yv={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/",math:"http://www.w3.org/1998/Math/MathML"},Ev=/%COMP%/g;var KE="%COMP%",qR=`_nghost-${KE}`,XR=`_ngcontent-${KE}`,YR=!0,ZR=new Pe("",{factory:()=>YR}),KR=new Pe("");function JR(n){return XR.replace(Ev,n)}function QR(n){return qR.replace(Ev,n)}function JE(n,e){return e.map(t=>t.replace(Ev,n))}var Mv=(()=>{class n{eventManager;sharedStylesHost;appId;removeStylesOnCompDestroy;doc;ngZone;nonce;tracingService;rendererByCompId=new Map;defaultRenderer;cssVarNamespace;constructor(t,i,r,s,o,a,c=null,l=null,u=null){this.eventManager=t,this.sharedStylesHost=i,this.appId=r,this.removeStylesOnCompDestroy=s,this.doc=o,this.ngZone=a,this.nonce=c,this.tracingService=l,this.cssVarNamespace=u??"",this.defaultRenderer=new Hc(t,o,a,this.tracingService,this.cssVarNamespace)}createRenderer(t,i){if(!t||!i)return this.defaultRenderer;let r=this.getOrCreateRenderer(t,i);return r instanceof zd?r.applyToHost(t):r instanceof zc&&r.applyStyles(),r}getOrCreateRenderer(t,i){let r=this.rendererByCompId,s=r.get(i.id);if(!s){let o=this.doc,a=this.ngZone,c=this.eventManager,l=this.sharedStylesHost,u=this.removeStylesOnCompDestroy,d=this.tracingService;switch(i.encapsulation){case vi.Emulated:s=new zd(c,l,i,this.appId,u,o,a,d,this.cssVarNamespace);break;case vi.ShadowDom:return new Hd(c,t,i,o,a,this.nonce,d,this.cssVarNamespace,l);case vi.ExperimentalIsolatedShadowDom:return new Hd(c,t,i,o,a,this.nonce,d,this.cssVarNamespace);default:s=new zc(c,l,i,u,o,a,d,this.cssVarNamespace);break}r.set(i.id,s)}return s}ngOnDestroy(){this.rendererByCompId.clear()}componentReplaced(t){this.rendererByCompId.delete(t)}static \u0275fac=function(i){return new(i||n)(qe(xv),qe(Js),qe(Mc),qe(ZR),qe(zt),qe(Pn),qe(id),qe(Zs,8),qe(KR,8))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})(),Hc=class{eventManager;doc;ngZone;tracingService;cssVarNamespace;data=Object.create(null);throwOnSyntheticProps=!0;constructor(e,t,i,r,s=""){this.eventManager=e,this.doc=t,this.ngZone=i,this.tracingService=r,this.cssVarNamespace=s}destroy(){}destroyNode=null;createElement(e,t){return t?this.doc.createElementNS(yv[t]||t,e):this.doc.createElement(e)}createComment(e){return this.doc.createComment(e)}createText(e){return this.doc.createTextNode(e)}appendChild(e,t){(ZE(e)?e.content:e).appendChild(t)}insertBefore(e,t,i){if(e){let r=ZE(e)?e.content:e;if(i!=null&&i.parentNode!==r)throw new Ce(-5106,!1);r.insertBefore(t,i)}}removeChild(e,t){t.remove()}selectRootElement(e,t){let i=typeof e=="string"?this.doc.querySelector(e):e;if(!i)throw new Ce(-5104,!1);return t||(i.textContent=""),i}parentNode(e){return e.parentNode}nextSibling(e){return e.nextSibling}setAttribute(e,t,i,r){if(r){t=r+":"+t;let s=yv[r];s?e.setAttributeNS(s,t,i):e.setAttribute(t,i)}else e.setAttribute(t,i)}removeAttribute(e,t,i){if(i){let r=yv[i];r?e.removeAttributeNS(r,t):e.removeAttribute(`${i}:${t}`)}else e.removeAttribute(t)}addClass(e,t){e.classList.add(t)}removeClass(e,t){e.classList.remove(t)}setStyle(e,t,i,r){let s=t.startsWith("--");s&&(t=t.replace("%NS%",this.cssVarNamespace)),s||r&(_r.DashCase|_r.Important)?e.style.setProperty(t,i,r&_r.Important?"important":""):e.style[t]=i}removeStyle(e,t,i){let r=t.startsWith("--");r&&(t=t.replace("%NS%",this.cssVarNamespace)),r||i&_r.DashCase?e.style.removeProperty(t):e.style[t]=""}setProperty(e,t,i){e!=null&&(e[t]=i)}setValue(e,t){e.nodeValue=t}listen(e,t,i,r){if(typeof e=="string"&&(e=Er().getGlobalEventTarget(this.doc,e),!e))throw new Ce(-5102,!1);let s=this.decoratePreventDefault(i);return this.tracingService?.wrapEventListener&&(s=this.tracingService.wrapEventListener(e,t,s)),this.eventManager.addEventListener(e,t,s,r)}decoratePreventDefault(e){return t=>{if(t==="__ngUnwrap__")return e;e(t)===!1&&t.preventDefault()}}};function ZE(n){return n.tagName==="TEMPLATE"&&n.content!==void 0}var Hd=class extends Hc{hostEl;sharedStylesHost;shadowRoot;constructor(e,t,i,r,s,o,a,c,l){super(e,r,s,a,c),this.hostEl=t,this.sharedStylesHost=l,this.shadowRoot=t.attachShadow({mode:"open"}),this.sharedStylesHost&&this.sharedStylesHost.addHost(this.shadowRoot);let u=i.styles;u=JE(i.id,u).map(f=>f.replace(/%NS%/g,c));for(let f of u){let h=document.createElement("style");o&&h.setAttribute("nonce",o),h.textContent=f,this.shadowRoot.appendChild(h)}let d=i.getExternalStyles?.();if(d)for(let f of d){let h=_v(f,r);o&&h.setAttribute("nonce",o),this.shadowRoot.appendChild(h)}}nodeOrShadowRoot(e){return e===this.hostEl?this.shadowRoot:e}appendChild(e,t){return super.appendChild(this.nodeOrShadowRoot(e),t)}insertBefore(e,t,i){return super.insertBefore(this.nodeOrShadowRoot(e),t,i)}removeChild(e,t){return super.removeChild(null,t)}parentNode(e){return this.nodeOrShadowRoot(super.parentNode(this.nodeOrShadowRoot(e)))}destroy(){this.sharedStylesHost&&this.sharedStylesHost.removeHost(this.shadowRoot)}},zc=class extends Hc{sharedStylesHost;removeStylesOnCompDestroy;styles;styleUrls;constructor(e,t,i,r,s,o,a,c,l){super(e,s,o,a,c),this.sharedStylesHost=t,this.removeStylesOnCompDestroy=r;let u=i.styles,d=l?JE(l,u):u;this.styles=d.map(f=>f.replace(/%NS%/g,c)),this.styleUrls=i.getExternalStyles?.(l)}applyStyles(){this.sharedStylesHost.addStyles(this.styles,this.styleUrls)}destroy(){this.removeStylesOnCompDestroy&&Bg.size===0&&this.sharedStylesHost.removeStyles(this.styles,this.styleUrls)}},zd=class extends zc{contentAttr;hostAttr;constructor(e,t,i,r,s,o,a,c,l){let u=r+"-"+i.id;super(e,t,i,s,o,a,c,l,u),this.contentAttr=JR(u),this.hostAttr=QR(u)}applyToHost(e){this.applyStyles(),this.setAttribute(e,this.hostAttr,"")}createElement(e,t){let i=super.createElement(e,t);return super.setAttribute(i,this.contentAttr,""),i}};var jd=class n extends Bc{supportsDOMEvents=!0;static makeCurrent(){hv(new n)}onAndCancel(e,t,i,r){return e.addEventListener(t,i,r),()=>{e.removeEventListener(t,i,r)}}dispatchEvent(e,t){e.dispatchEvent(t)}remove(e){e.remove()}createElement(e,t){return t=t||this.getDefaultDocument(),t.createElement(e)}createHtmlDocument(){return document.implementation.createHTMLDocument("fakeTitle")}getDefaultDocument(){return document}isElementNode(e){return e.nodeType===Node.ELEMENT_NODE}isShadowRoot(e){return e instanceof DocumentFragment}getGlobalEventTarget(e,t){return t==="window"?window:t==="document"?e:t==="body"?e.body:null}getBaseHref(e){let t=eN();return t==null?null:tN(t)}resetBaseElement(){Gc=null}getUserAgent(){return window.navigator.userAgent}getCookie(e){return gv(document.cookie,e)}},Gc=null;function eN(){return Gc=Gc||document.head.querySelector("base"),Gc?Gc.getAttribute("href"):null}function tN(n){return new URL(n,document.baseURI).pathname}var QE=["alt","control","meta","shift"],nN={"\b":"Backspace","	":"Tab","\x7F":"Delete","\x1B":"Escape",Del:"Delete",Esc:"Escape",Left:"ArrowLeft",Right:"ArrowRight",Up:"ArrowUp",Down:"ArrowDown",Menu:"ContextMenu",Scroll:"ScrollLock",Win:"OS"},iN={alt:n=>n.altKey,control:n=>n.ctrlKey,meta:n=>n.metaKey,shift:n=>n.shiftKey},eM=(()=>{class n extends Vc{constructor(t){super(t)}supports(t){return n.parseEventName(t)!=null}addEventListener(t,i,r,s){let o=n.parseEventName(i),a=n.eventCallback(o.fullKey,r,this.manager.getZone());return this.manager.getZone().runOutsideAngular(()=>Er().onAndCancel(t,o.domEventName,a,s))}static parseEventName(t){let i=t.toLowerCase().split("."),r=i.shift();if(i.length===0||!(r==="keydown"||r==="keyup"))return null;let s=n._normalizeKey(i.pop()),o="",a=i.indexOf("code");if(a>-1&&(i.splice(a,1),o="code."),QE.forEach(l=>{let u=i.indexOf(l);u>-1&&(i.splice(u,1),o+=l+".")}),o+=s,i.length!=0||s.length===0)return null;let c={};return c.domEventName=r,c.fullKey=o,c}static matchEventFullKeyCode(t,i){let r=nN[t.key]||t.key,s="";return i.indexOf("code.")>-1&&(r=t.code,s="code."),r==null||!r?!1:(r=r.toLowerCase(),r===" "?r="space":r==="."&&(r="dot"),QE.forEach(o=>{if(o!==r){let a=iN[o];a(t)&&(s+=o+".")}}),s+=r,s===i)}static eventCallback(t,i,r){return s=>{n.matchEventFullKeyCode(s,t)&&r.runGuarded(()=>i(s))}}static _normalizeKey(t){return t==="esc"?"escape":t}static \u0275fac=function(i){return new(i||n)(qe(zt))};static \u0275prov=ut({token:n,factory:n.\u0275fac})}return n})();async function bv(n,e,t){let i=he({rootComponent:n},rN(e,t));return HE(i)}function rN(n,e){return{platformRef:e?.platformRef,appProviders:[...lN,...n?.providers??[]],platformProviders:cN}}function sN(){jd.makeCurrent()}function oN(){return new hr}function aN(){return Lg(document),document}var cN=[{provide:bc,useValue:qE},{provide:nd,useValue:sN,multi:!0},{provide:zt,useFactory:aN}];var lN=[{provide:gc,useValue:"root"},{provide:hr,useFactory:oN},{provide:Gd,useClass:Vd,multi:!0},{provide:Gd,useClass:eM,multi:!0},Mv,{provide:Js,useClass:Sv},{provide:Sv,useExisting:Js},xv,{provide:Xs,useExisting:Mv},[]];var tM=(()=>{class n{_doc;constructor(t){this._doc=t}getTitle(){return this._doc.title}setTitle(t){this._doc.title=t||""}static \u0275fac=function(i){return new(i||n)(qe(zt))};static \u0275prov=ut({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var Ve="primary",il=Symbol("RouteTitle"),Av=class{params;constructor(e){this.params=e||{}}has(e){return Object.hasOwn(this.params,e)}get(e){if(this.has(e)){let t=this.params[e];return Array.isArray(t)?t[0]:t}return null}getAll(e){if(this.has(e)){let t=this.params[e];return Array.isArray(t)?t:[t]}return[]}get keys(){return Object.keys(this.params)}};function ao(n){return new Av(n)}function wv(n,e,t){for(let i=0;i<n.length;i++){let r=n[i],s=e[i];if(r[0]===":")t[r.substring(1)]=s;else if(r!==s.path)return!1}return!0}function lM(n,e,t){let i=t.path.split("/"),r=i.indexOf("**");if(r===-1){if(i.length>n.length||t.pathMatch==="full"&&(e.hasChildren()||i.length<n.length))return null;let c={},l=n.slice(0,i.length);return wv(i,l,c)?{consumed:l,posParams:c}:null}if(r!==i.lastIndexOf("**"))return null;let s=i.slice(0,r),o=i.slice(r+1);if(s.length+o.length>n.length||t.pathMatch==="full"&&e.hasChildren()&&t.path!=="**")return null;let a={};return!wv(s,n.slice(0,s.length),a)||!wv(o,n.slice(n.length-o.length),a)?null:{consumed:n,posParams:a}}function Zd(n){return new Promise((e,t)=>{n.pipe(lr()).subscribe({next:i=>e(i),error:i=>t(i)})})}function fN(n,e){if(n.length!==e.length)return!1;for(let t=0;t<n.length;++t)if(!ji(n[t],e[t]))return!1;return!0}function ji(n,e){let t=n?Rv(n):void 0,i=e?Rv(e):void 0;if(!t||!i||t.length!=i.length)return!1;let r;for(let s=0;s<t.length;s++)if(r=t[s],!uM(n[r],e[r]))return!1;return!0}function Rv(n){return[...Object.keys(n),...Object.getOwnPropertySymbols(n)]}function uM(n,e){if(Array.isArray(n)&&Array.isArray(e)){if(n.length!==e.length)return!1;let t=[...n].sort(),i=[...e].sort();return t.every((r,s)=>i[s]===r)}else return n===e}function hN(n){return n.length>0?n[n.length-1]:null}function rl(n){return Du(n)?n:Lc(n)?Vt(Promise.resolve(n)):tt(n)}function dM(n){return Du(n)?Zd(n):Promise.resolve(n)}var pN={exact:pM,subset:mM},fM={exact:mN,subset:gN,ignored:()=>!0},hM={paths:"exact",fragment:"ignored",matrixParams:"ignored",queryParams:"exact"},Kd={paths:"subset",fragment:"ignored",matrixParams:"ignored",queryParams:"subset"};function Nv(n,e,t){let i=he(he({},Kd),t||{});return pN[i.paths](n.root,e.root,i.matrixParams)&&fM[i.queryParams](n.queryParams,e.queryParams)&&!(i.fragment==="exact"&&n.fragment!==e.fragment)}function mN(n,e){return ji(n,e)}function pM(n,e,t){if(!oo(n.segments,e.segments)||!qd(n.segments,e.segments,t)||n.numberOfChildren!==e.numberOfChildren)return!1;for(let i in e.children)if(!n.children[i]||!pM(n.children[i],e.children[i],t))return!1;return!0}function gN(n,e){return Object.keys(e).length<=Object.keys(n).length&&Object.keys(e).every(t=>uM(n[t],e[t]))}function mM(n,e,t){return gM(n,e,e.segments,t)}function gM(n,e,t,i){if(n.segments.length>t.length){let r=n.segments.slice(0,t.length);return!(!oo(r,t)||e.hasChildren()||!qd(r,t,i))}else if(n.segments.length===t.length){if(!oo(n.segments,t)||!qd(n.segments,t,i))return!1;for(let r in e.children)if(!n.children[r]||!mM(n.children[r],e.children[r],i))return!1;return!0}else{let r=t.slice(0,n.segments.length),s=t.slice(n.segments.length);return!oo(n.segments,r)||!qd(n.segments,r,i)||!n.children[Ve]?!1:gM(n.children[Ve],e,s,i)}}function qd(n,e,t){return e.every((i,r)=>fM[t](n[r].parameters,i.parameters))}var oi=class{root;queryParams;fragment;_queryParamMap;constructor(e=new ht([],{}),t={},i=null){this.root=e,this.queryParams=t,this.fragment=i}get queryParamMap(){return this._queryParamMap??=ao(this.queryParams),this._queryParamMap}toString(){return xN.serialize(this)}},ht=class{segments;children;parent=null;constructor(e,t){this.segments=e,this.children=t,Object.values(t).forEach(i=>i.parent=this)}hasChildren(){return this.numberOfChildren>0}get numberOfChildren(){return Object.keys(this.children).length}toString(){return Xd(this)}},ss=class{path;parameters;_parameterMap;constructor(e,t){this.path=e,this.parameters=t}get parameterMap(){return this._parameterMap??=ao(this.parameters),this._parameterMap}toString(){return yM(this)}};function vN(n,e){return oo(n,e)&&n.every((t,i)=>ji(t.parameters,e[i].parameters))}function oo(n,e){return n.length!==e.length?!1:n.every((t,i)=>t.path===e[i].path)}function yN(n,e){let t=[];return Object.entries(n.children).forEach(([i,r])=>{i===Ve&&(t=t.concat(e(r,i)))}),Object.entries(n.children).forEach(([i,r])=>{i!==Ve&&(t=t.concat(e(r,i)))}),t}var sl=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:()=>new os})}return n})(),os=class{parse(e){let t=new Ov(e);return new oi(t.parseRootSegment(),t.parseQueryParams(),t.parseFragment())}serialize(e){let t=`/${sa(e.root,!0)}`;_N(t)&&(t="/");let i=bN(e.queryParams),r=typeof e.fragment=="string"?`#${EN(e.fragment)}`:"";return`${t}${i}${r}`}},nM="http://fake";function _N(n){try{let e=new URL(n,nM);return e.origin!==nM||e.pathname.startsWith("//")}catch{return!0}}var xN=new os;function Xd(n){return n.segments.map(e=>yM(e)).join("/")}function sa(n,e){if(!n.hasChildren())return Xd(n);if(e){let t=n.children[Ve]?sa(n.children[Ve],!1):"",i=[];return Object.entries(n.children).forEach(([r,s])=>{r!==Ve&&i.push(`${r}:${sa(s,!1)}`)}),i.length>0?`${t}(${i.join("//")})`:t}else{if(Object.keys(n.children).length===1&&n.children[Ve]!=null)return`${Xd(n)}/${sa(n.children[Ve],!1)}`;let t=yN(n,(i,r)=>r===Ve?[SN(sa(n.children[Ve],!1))]:[`${r}:${sa(i,!1)}`]);return`${Xd(n)}/(${t.join("//")})`}}function SN(n){return n.replace(_M,e=>e.replace(/:/g,"%3A"))}function vM(n){return encodeURIComponent(n).replace(/%40/g,"@").replace(/%3A/gi,":").replace(/%24/g,"$").replace(/%2C/gi,",")}function Wd(n){return vM(n).replace(/%3B/gi,";")}function EN(n){return encodeURI(n)}function Pv(n){return vM(n).replace(/\(/g,"%28").replace(/\)/g,"%29").replace(/%26/gi,"&")}function Yd(n){return decodeURIComponent(n)}function iM(n){return Yd(n.replace(/\+/g,"%20"))}function yM(n){return`${Pv(n.path)}${MN(n.parameters)}`}function MN(n){return Object.entries(n).map(([e,t])=>`;${Pv(e)}=${Pv(t)}`).join("")}function bN(n){let e=Object.entries(n).map(([t,i])=>Array.isArray(i)?i.map(r=>`${Wd(t)}=${Wd(r)}`).join("&"):`${Wd(t)}=${Wd(i)}`).filter(t=>t);return e.length?`?${e.join("&")}`:""}var Cv=1073741824;function Jd(n,e,t){Number(e)>=32&&!Object.hasOwn(n,Cv)&&(n[Cv]=t,delete n[Cv]),n[e]=t}var _M=/^[^\/()?;#]+/;function Tv(n){let e=n.match(_M);return e?e[0]:""}var wN=/^[^\/()?;=#]+/;function CN(n){let e=n.match(wN);return e?e[0]:""}var TN=/^[^=?&#]+/;function DN(n){let e=n.match(TN);return e?e[0]:""}var IN=/^[^&#]+/;function AN(n){let e=n.match(IN);return e?e[0]:""}var Ov=class{url;remaining;constructor(e){this.url=e,this.remaining=e}parseRootSegment(){for(;this.consumeOptional("/"););return this.remaining===""||this.peekStartsWith("?")||this.peekStartsWith("#")?new ht([],{}):new ht([],this.parseChildren())}parseQueryParams(){let e={};if(this.consumeOptional("?"))do this.parseQueryParam(e);while(this.consumeOptional("&"));return e}parseFragment(){return this.consumeOptional("#")?decodeURIComponent(this.remaining):null}parseChildren(e=0){if(e>50)throw new Ce(4010,!1);if(this.remaining==="")return{};this.consumeOptional("/");let t=[];for(this.peekStartsWith("(")||t.push(this.parseSegment());this.peekStartsWith("/")&&!this.peekStartsWith("//")&&!this.peekStartsWith("/(");)this.capture("/"),t.push(this.parseSegment());let i={};this.peekStartsWith("/(")&&(this.capture("/"),i=this.parseParens(!0,e));let r={};return this.peekStartsWith("(")&&(r=this.parseParens(!1,e)),(t.length>0||Object.keys(i).length>0)&&(r[Ve]=new ht(t,i)),r}parseSegment(){let e=Tv(this.remaining);if(e===""&&this.peekStartsWith(";"))throw new Ce(4009,!1);return this.capture(e),new ss(Yd(e),this.parseMatrixParams())}parseMatrixParams(){let e={};for(;this.consumeOptional(";");)this.parseParam(e);return e}parseParam(e){let t=CN(this.remaining);if(!t)return;this.capture(t);let i="";if(this.consumeOptional("=")){let r=Tv(this.remaining);r&&(i=r,this.capture(i))}Jd(e,Yd(t),Yd(i))}parseQueryParam(e){let t=DN(this.remaining);if(!t)return;this.capture(t);let i="";if(this.consumeOptional("=")){let o=AN(this.remaining);o&&(i=o,this.capture(i))}let r=iM(t),s=iM(i);if(Object.hasOwn(e,r)){let o=e[r];Array.isArray(o)||(o=[o],e[r]=o),o.push(s)}else e[r]=s}parseParens(e,t){let i=Object.create(null);for(this.capture("(");!this.consumeOptional(")")&&this.remaining.length>0;){let r=Tv(this.remaining),s=this.remaining[r.length];if(s!=="/"&&s!==")"&&s!==";")throw new Ce(4010,!1);let o;r.indexOf(":")>-1?(o=r.slice(0,r.indexOf(":")),this.capture(o),this.capture(":")):e&&(o=Ve);let a=this.parseChildren(t+1),c=Object.keys(a).length===1&&a[Ve]?a[Ve]:new ht([],a);Jd(i,o??Ve,c),this.consumeOptional("//")}return i}peekStartsWith(e){return this.remaining.startsWith(e)}consumeOptional(e){return this.peekStartsWith(e)?(this.remaining=this.remaining.substring(e.length),!0):!1}capture(e){if(!this.consumeOptional(e))throw new Ce(4011,!1)}};function xM(n){return n.segments.length>0?new ht([],{[Ve]:n}):n}function SM(n){let e=Object.create(null);for(let[i,r]of Object.entries(n.children)){let s=SM(r);if(i===Ve&&s.segments.length===0&&s.hasChildren())for(let[o,a]of Object.entries(s.children))Jd(e,o,a);else(s.segments.length>0||s.hasChildren())&&Jd(e,i,s)}let t=new ht(n.segments,e);return RN(t)}function RN(n){if(n.numberOfChildren===1&&n.children[Ve]){let e=n.children[Ve];return new ht(n.segments.concat(e.segments),e.children)}return n}function la(n){return n instanceof oi}function EM(n,e,t=null,i=null,r=new os){let s=MM(n);return bM(s,e,t,i,r)}function MM(n){let e;function t(s){let o={};for(let c of s.children){let l=t(c);o[c.outlet]=l}let a=new ht(s.url,o);return s===n&&(e=a),a}let i=t(n.root),r=xM(i);return e??r}function bM(n,e,t,i,r){let s=n;for(;s.parent;)s=s.parent;if(e.length===0)return Dv(s,s,s,t,i,r);let o=NN(e);if(o.toRoot())return Dv(s,s,new ht([],{}),t,i,r);let a=PN(o,s,n),c=a.processChildren?Wc(a.segmentGroup,a.index,o.commands):CM(a.segmentGroup,a.index,o.commands);return Dv(s,a.segmentGroup,c,t,i,r)}function Qd(n){return typeof n=="object"&&n!=null&&!n.outlets&&!n.segmentPath}function Yc(n){return typeof n=="object"&&n!=null&&n.outlets}function rM(n,e,t){n||="\u0275";let i=new oi;return i.queryParams={[n]:e},t.parse(t.serialize(i)).queryParams[n]}function Dv(n,e,t,i,r,s){let o={};for(let[l,u]of Object.entries(i??{}))u!=null&&(o[l]=Array.isArray(u)?u.map(d=>rM(l,d,s)):rM(l,u,s));let a;n===e?a=t:a=wM(n,e,t);let c=xM(SM(a));return new oi(c,o,r)}function wM(n,e,t){let i=Object.create(null);return Object.entries(n.children).forEach(([r,s])=>{s===e?i[r]=t:i[r]=wM(s,e,t)}),new ht(n.segments,i)}var ef=class{isAbsolute;numberOfDoubleDots;commands;constructor(e,t,i){if(this.isAbsolute=e,this.numberOfDoubleDots=t,this.commands=i,e&&i.length>0&&Qd(i[0]))throw new Ce(4003,!1);let r=i.find(Yc);if(r&&r!==hN(i))throw new Ce(4004,!1)}toRoot(){return this.isAbsolute&&this.commands.length===1&&this.commands[0]=="/"}};function NN(n){if(typeof n[0]=="string"&&n.length===1&&n[0]==="/")return new ef(!0,0,n);let e=0,t=!1,i=n.reduce((r,s,o)=>{if(typeof s=="object"&&s!=null){if(s.outlets){let a={};return Object.entries(s.outlets).forEach(([c,l])=>{a[c]=typeof l=="string"?l.split("/"):l}),[...r,{outlets:a}]}if(s.segmentPath)return[...r,s.segmentPath]}return typeof s!="string"?[...r,s]:o===0?(s.split("/").forEach((a,c)=>{c==0&&a==="."||(c==0&&a===""?t=!0:a===".."?e++:a!=""&&r.push(a))}),r):[...r,s]},[]);return new ef(t,e,i)}var aa=class{segmentGroup;processChildren;index;constructor(e,t,i){this.segmentGroup=e,this.processChildren=t,this.index=i}};function PN(n,e,t){if(n.isAbsolute)return new aa(e,!0,0);if(!t)return new aa(e,!1,NaN);if(t.parent===null)return new aa(t,!0,0);let i=Qd(n.commands[0])?0:1,r=t.segments.length-1+i;return ON(t,r,n.numberOfDoubleDots)}function ON(n,e,t){let i=n,r=e,s=t;for(;s>r;){if(s-=r,i=i.parent,!i)throw new Ce(4005,!1);r=i.segments.length}return new aa(i,!1,r-s)}function LN(n){return Yc(n[0])?n[0].outlets:{[Ve]:n}}function CM(n,e,t){if(n??=new ht([],{}),n.segments.length===0&&n.hasChildren())return Wc(n,e,t);let i=FN(n,e,t),r=t.slice(i.commandIndex);if(i.match&&i.pathIndex<n.segments.length){let s=new ht(n.segments.slice(0,i.pathIndex),{});return s.children[Ve]=new ht(n.segments.slice(i.pathIndex),n.children),Wc(s,0,r)}else return i.match&&r.length===0?new ht(n.segments,{}):i.match&&!n.hasChildren()?Lv(n,e,t):i.match?Wc(n,0,r):Lv(n,e,t)}function Wc(n,e,t){if(t.length===0)return new ht(n.segments,{});{let i=LN(t),r=Object.create(null);if(Object.keys(i).some(s=>s!==Ve)&&n.children[Ve]&&n.numberOfChildren===1&&n.children[Ve].segments.length===0){let s=Wc(n.children[Ve],e,t);return new ht(n.segments,s.children)}return Object.entries(i).forEach(([s,o])=>{typeof o=="string"&&(o=[o]),o!==null&&(r[s]=CM(n.children[s],e,o))}),Object.entries(n.children).forEach(([s,o])=>{i[s]===void 0&&(r[s]=o)}),new ht(n.segments,r)}}function FN(n,e,t){let i=0,r=e,s={match:!1,pathIndex:0,commandIndex:0};for(;r<n.segments.length;){if(i>=t.length)return s;let o=n.segments[r],a=t[i];if(Yc(a))break;let c=`${a}`,l=i<t.length-1?t[i+1]:null;if(r>0&&c===void 0)break;if(c&&l&&typeof l=="object"&&l.outlets===void 0){if(!oM(c,l,o))return s;i+=2}else{if(!oM(c,{},o))return s;i++}r++}return{match:!0,pathIndex:r,commandIndex:i}}function Lv(n,e,t){let i=n.segments.slice(0,e),r=0;for(;r<t.length;){let s=t[r];if(Yc(s)){let c=kN(s.outlets);return new ht(i,c)}if(r===0&&Qd(t[0])){let c=n.segments[e];i.push(new ss(c.path,sM(t[0]))),r++;continue}let o=Yc(s)?s.outlets[Ve]:`${s}`,a=r<t.length-1?t[r+1]:null;o&&a&&Qd(a)?(i.push(new ss(o,sM(a))),r+=2):(i.push(new ss(o,{})),r++)}return new ht(i,{})}function kN(n){let e={};return Object.entries(n).forEach(([t,i])=>{typeof i=="string"&&(i=[i]),i!==null&&(e[t]=Lv(new ht([],{}),0,i))}),e}function sM(n){let e={};return Object.entries(n).forEach(([t,i])=>e[t]=`${i}`),e}function oM(n,e,t){return n==t.path&&ji(e,t.parameters)}var tf=class{rootInjector;outlet=null;route=null;children;attachRef=null;get injector(){return this.route?.snapshot._environmentInjector??this.rootInjector}constructor(e){this.rootInjector=e,this.children=new co(this.rootInjector)}resetChildren(){this.children=new co(this.rootInjector)}},co=(()=>{class n{rootInjector;contexts=new Map;constructor(t){this.rootInjector=t}onChildOutletCreated(t,i){let r=this.getOrCreateContext(t);r.outlet=i,this.contexts.set(t,r)}onChildOutletDestroyed(t){let i=this.getContext(t);i&&(i.outlet=null,i.attachRef=null)}onOutletDeactivated(){let t=this.contexts;return this.contexts=new Map,t}onOutletReAttached(t){this.contexts=t}getOrCreateContext(t){let i=this.getContext(t);return i||(i=new tf(this.rootInjector),this.contexts.set(t,i)),i}getContext(t){return this.contexts.get(t)||null}static \u0275fac=function(i){return new(i||n)(qe(nn))};static \u0275prov=ut({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})(),nf=class{_root;constructor(e){this._root=e}get root(){return this._root.value}parent(e){let t=this.pathFromRoot(e);return t.length>1?t[t.length-2]:null}children(e){let t=Fv(e,this._root);return t?t.children.map(i=>i.value):[]}firstChild(e){let t=Fv(e,this._root);return t&&t.children.length>0?t.children[0].value:null}siblings(e){let t=kv(e,this._root);return t.length<2?[]:t[t.length-2].children.map(r=>r.value).filter(r=>r!==e)}pathFromRoot(e){return kv(e,this._root).map(t=>t.value)}};function Fv(n,e){if(n===e.value)return e;for(let t of e.children){let i=Fv(n,t);if(i)return i}return null}function kv(n,e){if(n===e.value)return[e];for(let t of e.children){let i=kv(n,t);if(i.length)return i.unshift(e),i}return[]}var Tn=class{value;children;constructor(e,t){this.value=e,this.children=t}toString(){return`TreeNode(${this.value})`}};function oa(n){let e={};return n&&n.children.forEach(t=>e[t.value.outlet]=t),e}var Zc=class extends nf{snapshot;constructor(e,t){super(e),this.snapshot=t,qv(this,e)}toString(){return this.snapshot.toString()}};function TM(n,e){let t=UN(n,e),i=new dn([new ss("",{})]),r=new dn({}),s=new dn({}),o=new dn({}),a=new dn(""),c=new $i(i,r,o,a,s,Ve,n,t.root);return c.snapshot=t.root,new Zc(new Tn(c,[]),t)}function UN(n,e){let t={},i={},r={},o=new ua([],t,r,"",i,Ve,n,null,{},e);return new Kc("",new Tn(o,[]))}var $i=class{urlSubject;paramsSubject;queryParamsSubject;fragmentSubject;dataSubject;outlet;component;snapshot;_futureSnapshot;_routerState;_paramMap;_queryParamMap;title;url;params;queryParams;fragment;data;resources;_localInjector;pending;paramsSignal;queryParamsSignal;paramMapSignal;queryParamMapSignal;fragmentSignal;dataSignal;constructor(e,t,i,r,s,o,a,c){this.urlSubject=e,this.paramsSubject=t,this.queryParamsSubject=i,this.fragmentSubject=r,this.dataSubject=s,this.outlet=o,this.component=a,this._futureSnapshot=c,this.title=this.dataSubject?.pipe(Pt(l=>l[il]))??tt(void 0),this.url=e,this.params=t,this.queryParams=i,this.fragment=r,this.data=s}get routeConfig(){return this._futureSnapshot.routeConfig}get root(){return this._routerState.root}get parent(){return this._routerState.parent(this)}get firstChild(){return this._routerState.firstChild(this)}get children(){return this._routerState.children(this)}get pathFromRoot(){return this._routerState.pathFromRoot(this)}get paramMap(){return this._paramMap??=this.params.pipe(Pt(e=>ao(e))),this._paramMap}get queryParamMap(){return this._queryParamMap??=this.queryParams.pipe(Pt(e=>ao(e))),this._queryParamMap}toString(){return this.snapshot?this.snapshot.toString():`Future(${this._futureSnapshot})`}_setPending(e){this._futureSnapshot=e,this.pending?.set(!0)}},BN="always";function $v(n,e,t){let i,{routeConfig:r}=n;return e!==null&&(t==="always"||r?.path===""||!e.component&&!e.routeConfig?.loadComponent)?i={params:Object.keys(n.params).length===0?e.params:Object.freeze(he(he({},e.params),n.params)),data:Object.freeze(he(he({},e.data),n.data)),resolve:he(he(he(he({},n.data),e.data),r?.data),n._resolvedData)}:i={params:Object.freeze(he({},n.params)),data:Object.freeze(he({},n.data)),resolve:he(he({},n.data),n._resolvedData??{})},r&&IM(r)&&(i.resolve[il]=r.title),i}var ua=class{url;params;queryParams;fragment;data;outlet;component;routeConfig;_resolve;_resolvedData;_routerState;_paramMap;_queryParamMap;_environmentInjector;resources;get title(){return this.data?.[il]}constructor(e,t,i,r,s,o,a,c,l,u){this.url=e,this.params=t,this.queryParams=i,this.fragment=r,this.data=s,this.outlet=o,this.component=a,this.routeConfig=c,this._resolve=l,this._environmentInjector=u}get root(){return this._routerState.root}get parent(){return this._routerState.parent(this)}get firstChild(){return this._routerState.firstChild(this)}get children(){return this._routerState.children(this)}get pathFromRoot(){return this._routerState.pathFromRoot(this)}get paramMap(){return this._paramMap??=ao(this.params),this._paramMap}get queryParamMap(){return this._queryParamMap??=ao(this.queryParams),this._queryParamMap}toString(){let e=this.url.map(i=>i.toString()).join("/"),t=this.routeConfig?this.routeConfig.path:"";return`Route(url:'${e}', path:'${t}')`}},Kc=class extends nf{url;constructor(e,t){super(t),this.url=e,qv(this,t)}toString(){return DM(this._root)}};function qv(n,e){e.value._routerState=n,e.children.forEach(t=>qv(n,t))}function DM(n){let e=n.children.length>0?` { ${n.children.map(DM).join(", ")} } `:"";return`${n.value}${e}`}function Iv(n){if(n.snapshot){let e=n.snapshot,t=n._futureSnapshot;n.snapshot=t,ji(e.queryParams,t.queryParams)||n.queryParamsSubject.next(t.queryParams),e.fragment!==t.fragment&&n.fragmentSubject.next(t.fragment),ji(e.params,t.params)||n.paramsSubject.next(t.params),fN(e.url,t.url)||n.urlSubject.next(t.url),ji(e.data,t.data)||n.dataSubject.next(t.data)}else n.snapshot=n._futureSnapshot,n.dataSubject.next(n._futureSnapshot.data)}function Uv(n,e){let t=ji(n.params,e.params)&&vN(n.url,e.url),i=!n.parent!=!e.parent;return t&&!i&&(!n.parent||Uv(n.parent,e.parent))}function IM(n){return typeof n.title=="string"||n.title===null}var AM=new Pe(""),ol=(()=>{class n{activated=null;get activatedComponentRef(){return this.activated}_activatedRoute=null;name=Ve;activateEvents=new Cn;deactivateEvents=new Cn;attachEvents=new Cn;detachEvents=new Cn;routerOutletData=dv();parentContexts=re(co);location=re(Qs);changeDetector=re(fv);inputBinder=re(gf,{optional:!0});supportsBindingToComponentInputs=!0;ngOnChanges(t){if(t.name){let{firstChange:i,previousValue:r}=t.name;if(i)return;this.isTrackedInParentContexts(r)&&(this.deactivate(),this.parentContexts.onChildOutletDestroyed(r)),this.initializeOutletWithName()}}ngOnDestroy(){this.isTrackedInParentContexts(this.name)&&this.parentContexts.onChildOutletDestroyed(this.name),this.inputBinder?.unsubscribeFromRouteData(this)}isTrackedInParentContexts(t){return this.parentContexts.getContext(t)?.outlet===this}ngOnInit(){this.initializeOutletWithName()}initializeOutletWithName(){if(this.parentContexts.onChildOutletCreated(this.name,this),this.activated)return;let t=this.parentContexts.getContext(this.name);t?.route&&(t.attachRef?this.attach(t.attachRef,t.route):this.activateWith(t.route,t.injector))}get isActivated(){return!!this.activated}get component(){if(!this.activated)throw new Ce(4012,!1);return this.activated.instance}get activatedRoute(){if(!this.activated)throw new Ce(4012,!1);return this._activatedRoute}get activatedRouteData(){return this._activatedRoute?this._activatedRoute.snapshot.data:{}}detach(){if(!this.activated)throw new Ce(4012,!1);this.location.detach();let t=this.activated;return this.activated=null,this._activatedRoute=null,this.detachEvents.emit(t.instance),t}attach(t,i){this.activated=t,this._activatedRoute=i,this.location.insert(t.hostView),this.inputBinder?.bindActivatedRouteToOutletComponent(this,this.location.injector),this.attachEvents.emit(t.instance)}deactivate(){if(this.activated){let t=this.component;this.inputBinder?.unsubscribeFromRouteData(this),this.activated.destroy(),this.activated=null,this._activatedRoute=null,this.deactivateEvents.emit(t)}}activateWith(t,i){if(this.isActivated)throw new Ce(4013,!1);this._activatedRoute=t;let r=this.location,o=t.snapshot.component,a=this.parentContexts.getOrCreateContext(this.name).children,c=new Bv(t,a,r.injector,this.routerOutletData);this.activated=r.createComponent(o,{index:r.length,injector:c,environmentInjector:i}),this.changeDetector.markForCheck(),this.inputBinder?.bindActivatedRouteToOutletComponent(this,this.location.injector),this.activateEvents.emit(this.activated.instance)}static \u0275fac=function(i){return new(i||n)};static \u0275dir=Od({type:n,selectors:[["router-outlet"]],inputs:{name:"name",routerOutletData:[1,"routerOutletData"]},outputs:{activateEvents:"activate",deactivateEvents:"deactivate",attachEvents:"attach",detachEvents:"detach"},exportAs:["outlet"],features:[wd]})}return n})(),Bv=class{route;childContexts;parent;outletData;constructor(e,t,i,r){this.route=e,this.childContexts=t,this.parent=i,this.outletData=r}get(e,t){return e===$i?this.route:e===co?this.childContexts:e===AM?this.outletData:this.parent.get(e,t)}},gf=new Pe("");var Xv=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275cmp=xr({type:n,selectors:[["ng-component"]],exportAs:["emptyRouterOutlet"],decls:1,vars:0,template:function(i,r){i&1&&ia(0,"router-outlet")},dependencies:[ol],encapsulation:2,changeDetection:1})}return n})();function Yv(n){let e=n.children&&n.children.map(Yv),t=e?_t(he({},n),{children:e}):he({},n);return!t.component&&!t.loadComponent&&(e||t.loadChildren)&&t.outlet&&t.outlet!==Ve&&(t.component=Xv),t}var $c="imperative",rn=(function(n){return n[n.NavigationStart=0]="NavigationStart",n[n.NavigationEnd=1]="NavigationEnd",n[n.NavigationCancel=2]="NavigationCancel",n[n.NavigationError=3]="NavigationError",n[n.RoutesRecognized=4]="RoutesRecognized",n[n.ResolveStart=5]="ResolveStart",n[n.ResolveEnd=6]="ResolveEnd",n[n.GuardsCheckStart=7]="GuardsCheckStart",n[n.GuardsCheckEnd=8]="GuardsCheckEnd",n[n.RouteConfigLoadStart=9]="RouteConfigLoadStart",n[n.RouteConfigLoadEnd=10]="RouteConfigLoadEnd",n[n.ChildActivationStart=11]="ChildActivationStart",n[n.ChildActivationEnd=12]="ChildActivationEnd",n[n.ActivationStart=13]="ActivationStart",n[n.ActivationEnd=14]="ActivationEnd",n[n.Scroll=15]="Scroll",n[n.NavigationSkipped=16]="NavigationSkipped",n})(rn||{}),zn=class{id;url;constructor(e,t){this.id=e,this.url=t}},lo=class extends zn{type=rn.NavigationStart;navigationTrigger;restoredState;constructor(e,t,i="imperative",r=null){super(e,t),this.navigationTrigger=i,this.restoredState=r}toString(){return`NavigationStart(id: ${this.id}, url: '${this.url}')`}},Mr=class extends zn{urlAfterRedirects;type=rn.NavigationEnd;constructor(e,t,i){super(e,t),this.urlAfterRedirects=i}toString(){return`NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`}},vn=(function(n){return n[n.Redirect=0]="Redirect",n[n.SupersededByNewNavigation=1]="SupersededByNewNavigation",n[n.NoDataFromResolver=2]="NoDataFromResolver",n[n.GuardRejected=3]="GuardRejected",n[n.Aborted=4]="Aborted",n})(vn||{}),Jc=(function(n){return n[n.IgnoredSameUrlNavigation=0]="IgnoredSameUrlNavigation",n[n.IgnoredByUrlHandlingStrategy=1]="IgnoredByUrlHandlingStrategy",n})(Jc||{}),si=class extends zn{reason;code;type=rn.NavigationCancel;constructor(e,t,i,r){super(e,t),this.reason=i,this.code=r}toString(){return`NavigationCancel(id: ${this.id}, url: '${this.url}')`}};function RM(n){return n instanceof si&&(n.code===vn.Redirect||n.code===vn.SupersededByNewNavigation)}var br=class extends zn{reason;code;type=rn.NavigationSkipped;constructor(e,t,i,r){super(e,t),this.reason=i,this.code=r}},uo=class extends zn{error;target;type=rn.NavigationError;constructor(e,t,i,r){super(e,t),this.error=i,this.target=r}toString(){return`NavigationError(id: ${this.id}, url: '${this.url}', error: ${this.error})`}},Qc=class extends zn{urlAfterRedirects;state;type=rn.RoutesRecognized;constructor(e,t,i,r){super(e,t),this.urlAfterRedirects=i,this.state=r}toString(){return`RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`}},rf=class extends zn{urlAfterRedirects;state;type=rn.GuardsCheckStart;constructor(e,t,i,r){super(e,t),this.urlAfterRedirects=i,this.state=r}toString(){return`GuardsCheckStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`}},sf=class extends zn{urlAfterRedirects;state;shouldActivate;type=rn.GuardsCheckEnd;constructor(e,t,i,r,s){super(e,t),this.urlAfterRedirects=i,this.state=r,this.shouldActivate=s}toString(){return`GuardsCheckEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state}, shouldActivate: ${this.shouldActivate})`}},of=class extends zn{urlAfterRedirects;state;type=rn.ResolveStart;constructor(e,t,i,r){super(e,t),this.urlAfterRedirects=i,this.state=r}toString(){return`ResolveStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`}},af=class extends zn{urlAfterRedirects;state;type=rn.ResolveEnd;constructor(e,t,i,r){super(e,t),this.urlAfterRedirects=i,this.state=r}toString(){return`ResolveEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`}},cf=class{route;type=rn.RouteConfigLoadStart;constructor(e){this.route=e}toString(){return`RouteConfigLoadStart(path: ${this.route.path})`}},lf=class{route;type=rn.RouteConfigLoadEnd;constructor(e){this.route=e}toString(){return`RouteConfigLoadEnd(path: ${this.route.path})`}},uf=class{snapshot;type=rn.ChildActivationStart;constructor(e){this.snapshot=e}toString(){return`ChildActivationStart(path: '${this.snapshot.routeConfig&&this.snapshot.routeConfig.path||""}')`}},df=class{snapshot;type=rn.ChildActivationEnd;constructor(e){this.snapshot=e}toString(){return`ChildActivationEnd(path: '${this.snapshot.routeConfig&&this.snapshot.routeConfig.path||""}')`}},ff=class{snapshot;type=rn.ActivationStart;constructor(e){this.snapshot=e}toString(){return`ActivationStart(path: '${this.snapshot.routeConfig&&this.snapshot.routeConfig.path||""}')`}},hf=class{snapshot;type=rn.ActivationEnd;constructor(e){this.snapshot=e}toString(){return`ActivationEnd(path: '${this.snapshot.routeConfig&&this.snapshot.routeConfig.path||""}')`}};var da=class{},el=class{},fa=class{url;navigationBehaviorOptions;constructor(e,t){this.url=e,this.navigationBehaviorOptions=t}};function VN(n){return!(n instanceof da)&&!(n instanceof fa)&&!(n instanceof el)}function HN(n,e,t){let i=new Set,r=tl(n,e._root,t?t._root:void 0,i);return{newlyCreatedRoutes:i,state:new Zc(r,e)}}function tl(n,e,t,i){if(t&&n.shouldReuseRoute(e.value,t.value.snapshot)){let r=t.value;r._setPending(e.value);let s=zN(n,e,t,i);return new Tn(r,s)}else{if(n.shouldAttach(e.value)){let o=n.retrieve(e.value);if(o!==null){let a=o.route;return a.value._setPending(e.value),a.children=e.children.map(c=>tl(n,c,void 0,i)),a}}let r=GN(e.value);r._setPending(e.value),i.add(r);let s=e.children.map(o=>tl(n,o,void 0,i));return new Tn(r,s)}}function zN(n,e,t,i){return e.children.map(r=>{for(let s of t.children)if(n.shouldReuseRoute(r.value,s.value.snapshot))return tl(n,r,s,i);return tl(n,r,void 0,i)})}function GN(n){return new $i(new dn(n.url),new dn(n.params),new dn(n.queryParams),new dn(n.fragment),new dn(n.data),n.outlet,n.component,n)}var as=class n extends Error{redirectTo;navigationBehaviorOptions;constructor(e,t){super(),this.redirectTo=e,this.navigationBehaviorOptions=t,Object.setPrototypeOf(this,n.prototype)}},NM="ngNavigationCancelingError";function qc(n,e){let{redirectTo:t,navigationBehaviorOptions:i}=la(e)?{redirectTo:e,navigationBehaviorOptions:void 0}:e,r=PM(!1,vn.Redirect);return r.url=t,r.navigationBehaviorOptions=i,r}function PM(n,e){let t=new Error(`NavigationCancelingError: ${n||""}`);return t[NM]=!0,t.cancellationCode=e,t}function jN(n){return OM(n)&&la(n.url)}function OM(n){return!!n&&n[NM]}var Vv=class{routeReuseStrategy;futureState;currState;forwardEvent;inputBindingEnabled;constructor(e,t,i,r,s){this.routeReuseStrategy=e,this.futureState=t,this.currState=i,this.forwardEvent=r,this.inputBindingEnabled=s}activate(e){let t=this.futureState._root,i=this.currState?this.currState._root:null;this.deactivateChildRoutes(t,i,e),Iv(this.futureState.root),this.activateChildRoutes(t,i,e)}deactivateChildRoutes(e,t,i){let r=oa(t);e.children.forEach(s=>{let o=s.value.outlet;this.deactivateRoutes(s,r[o],i),delete r[o]}),Object.values(r).forEach(s=>{this.deactivateRouteAndItsChildren(s,i)})}deactivateRoutes(e,t,i){let r=e.value,s=t?t.value:null;if(r===s)if(r.component){let o=i.getContext(r.outlet);o&&this.deactivateChildRoutes(e,t,o.children)}else this.deactivateChildRoutes(e,t,i);else s&&this.deactivateRouteAndItsChildren(t,i)}deactivateRouteAndItsChildren(e,t){e.value.component&&this.routeReuseStrategy.shouldDetach(e.value.snapshot)?this.detachAndStoreRouteSubtree(e,t):this.deactivateRouteAndOutlet(e,t)}detachAndStoreRouteSubtree(e,t){let i=t.getContext(e.value.outlet),r=i&&e.value.component?i.children:t,s=oa(e);for(let o of Object.values(s))this.deactivateRouteAndItsChildren(o,r);if(i&&i.outlet){let o=i.outlet.detach(),a=i.children.contexts;i.resetChildren(),this.routeReuseStrategy.store(e.value.snapshot,{componentRef:o,route:e,contexts:a})}}deactivateRouteAndOutlet(e,t){let i=t.getContext(e.value.outlet),r=i&&e.value.component?i.children:t,s=oa(e);for(let o of Object.values(s))this.deactivateRouteAndItsChildren(o,r);i&&(i.outlet&&(i.outlet.deactivate(),i.children.onOutletDeactivated()),i.attachRef=null,i.route=null),e.value._localInjector?.destroy()}activateChildRoutes(e,t,i){let r=oa(t);e.children.forEach(s=>{this.activateRoutes(s,r[s.value.outlet],i),this.forwardEvent(new hf(s.value.snapshot))}),e.children.length&&this.forwardEvent(new df(e.value.snapshot))}activateRoutes(e,t,i){let r=e.value,s=t?t.value:null;if(Iv(r),r===s)if(r.component){let o=i.getOrCreateContext(r.outlet);this.activateChildRoutes(e,t,o.children)}else this.activateChildRoutes(e,t,i);else if(r.component){let o=i.getOrCreateContext(r.outlet);if(this.routeReuseStrategy.shouldAttach(r.snapshot)){let a=this.routeReuseStrategy.retrieve(r.snapshot);this.routeReuseStrategy.store(r.snapshot,null),o.children.onOutletReAttached(a.contexts),o.attachRef=a.componentRef,o.route=a.route.value,o.outlet&&o.outlet.attach(a.componentRef,a.route.value),Iv(a.route.value),this.activateChildRoutes(e,null,o.children)}else o.attachRef=null,o.route=r,o.outlet&&o.outlet.activateWith(r,o.injector),this.activateChildRoutes(e,null,o.children)}else this.activateChildRoutes(e,null,i)}},pf=class{path;route;constructor(e){this.path=e,this.route=this.path[this.path.length-1]}},ca=class{component;route;constructor(e,t){this.component=e,this.route=t}};function WN(n,e,t){let i=n._root,r=e?e._root:null;return jc(i,r,t,[i.value])}function $N(n){let e=n.routeConfig?n.routeConfig.canActivateChild:null;return!e||e.length===0?null:{node:n,guards:e}}function pa(n,e){let t=Symbol(),i=e.get(n,t);return i===t?typeof n=="function"&&!am(n)?n:e.get(n):i}function jc(n,e,t,i,r={canDeactivateChecks:[],canActivateChecks:[]}){let s=oa(e);return n.children.forEach(o=>{qN(o,s[o.value.outlet],t,i.concat([o.value]),r),delete s[o.value.outlet]}),Object.entries(s).forEach(([o,a])=>Xc(a,t.getContext(o),t,r)),r}function qN(n,e,t,i,r={canDeactivateChecks:[],canActivateChecks:[]}){let s=n.value,o=e?e.value:null,a=t?t.getContext(n.value.outlet):null;if(o&&s.routeConfig===o.routeConfig){let c=XN(o,s,s.routeConfig.runGuardsAndResolvers);c?r.canActivateChecks.push(new pf(i)):(s.data=o.data,s._resolvedData=o._resolvedData),s.component?jc(n,e,a?a.children:null,i,r):jc(n,e,t,i,r),c&&a&&a.outlet&&a.outlet.isActivated&&r.canDeactivateChecks.push(new ca(a.outlet.component,o))}else o&&Xc(e,a,t,r),r.canActivateChecks.push(new pf(i)),s.component?jc(n,null,a?a.children:null,i,r):jc(n,null,t,i,r);return r}function XN(n,e,t){if(typeof t=="function")return hn(e._environmentInjector,()=>t(n,e));switch(t){case"pathParamsChange":return!oo(n.url,e.url);case"pathParamsOrQueryParamsChange":return!oo(n.url,e.url)||!ji(n.queryParams,e.queryParams);case"always":return!0;case"paramsOrQueryParamsChange":return!Uv(n,e)||!ji(n.queryParams,e.queryParams);default:return!Uv(n,e)}}function Xc(n,e,t,i){let r=oa(n),s=n.value;Object.entries(r).forEach(([o,a])=>{s.component?e?Xc(a,e.children.getContext(o),e.children,i):Xc(a,null,null,i):Xc(a,t?t.getContext(o):null,t,i)}),s.component?e&&e.outlet&&e.outlet.isActivated?i.canDeactivateChecks.push(new ca(e.outlet.component,s)):i.canDeactivateChecks.push(new ca(null,s)):i.canDeactivateChecks.push(new ca(null,s))}function al(n){return typeof n=="function"}function YN(n){return typeof n=="boolean"}function ZN(n){return n&&al(n.canLoad)}function KN(n){return n&&al(n.canActivate)}function JN(n){return n&&al(n.canActivateChild)}function QN(n){return n&&al(n.canDeactivate)}function e1(n){return n&&al(n.canMatch)}function LM(n){return n instanceof Os||n?.name==="EmptyError"}var $d=Symbol("INITIAL_VALUE");function ha(){return Qn(n=>Hp(n.map(e=>e.pipe(jr(1),Po(t=>{if(t instanceof as)return tt(t);throw t}),Gp($d)))).pipe(Pt(e=>{for(let t of e)if(t!==!0){if(t===$d)return $d;if(t===!1||t1(t))return t}return!0}),cr(e=>e!==$d),jr(1)))}function t1(n){return la(n)||n instanceof as}function FM(n){return new st(e=>{if(n.aborted){e.next(),e.complete();return}let t=()=>{e.next(),e.complete()};return n.addEventListener("abort",t),()=>n.removeEventListener("abort",t)})}function kM(n){return ac(FM(n))}function n1(n){return wn(e=>{let{targetSnapshot:t,currentSnapshot:i,guards:{canActivateChecks:r,canDeactivateChecks:s}}=e;return s.length===0&&r.length===0?tt(_t(he({},e),{guardsResult:!0})):i1(s,t,i).pipe(wn(o=>o&&YN(o)?r1(t,r,n):tt(o)),Pt(o=>_t(he({},e),{guardsResult:o})))})}function i1(n,e,t){return Vt(n).pipe(wn(i=>l1(i.component,i.route,t,e)),lr(i=>i!==!0,!0))}function r1(n,e,t){return Vt(e).pipe(Iu(i=>No(o1(i.route.parent,t),s1(i.route,t),c1(n,i.path),a1(n,i.route))),lr(i=>i!==!0,!0))}function s1(n,e){return n!==null&&e&&e(new ff(n)),tt(!0)}function o1(n,e){return n!==null&&e&&e(new uf(n)),tt(!0)}function a1(n,e){let t=e.routeConfig?e.routeConfig.canActivate:null;if(!t||t.length===0)return tt(!0);let i=t.map(r=>oc(()=>{let s=e._environmentInjector,o=pa(r,s),a=KN(o)?o.canActivate(e,n):hn(s,()=>o(e,n));return rl(a).pipe(lr())}));return tt(i).pipe(ha())}function c1(n,e){let t=e[e.length-1],r=e.slice(0,e.length-1).reverse().map(s=>$N(s)).filter(s=>s!==null).map(s=>oc(()=>{let o=s.guards.map(a=>{let c=s.node._environmentInjector,l=pa(a,c),u=JN(l)?l.canActivateChild(t,n):hn(c,()=>l(t,n));return rl(u).pipe(lr())});return tt(o).pipe(ha())}));return tt(r).pipe(ha())}function l1(n,e,t,i){let r=e&&e.routeConfig?e.routeConfig.canDeactivate:null;if(!r||r.length===0)return tt(!0);let s=r.map(o=>{let a=e._environmentInjector,c=pa(o,a);return Zv(()=>QN(c)?c.canDeactivate(n,e,t,i):hn(a,()=>c(n,e,t,i))).pipe(lr())});return tt(s).pipe(ha())}function u1(n,e,t,i,r){let s=e.canLoad;if(s===void 0||s.length===0)return tt(!0);let o=s.map(a=>{let c=pa(a,n),l=Zv(()=>ZN(c)?c.canLoad(e,t):hn(n,()=>c(e,t)));return r?l.pipe(kM(r)):l});return tt(o).pipe(ha(),UM(i))}function Zv(n){try{return rl(n())}catch(e){return new st(t=>t.error(e))}}function UM(n){return pu(ei(e=>{if(typeof e!="boolean")throw qc(n,e)}),Pt(e=>e===!0))}function d1(n,e,t,i,r,s){let o=e.canMatch;if(!o||o.length===0)return tt(!0);let a=o.map(c=>{let l=pa(c,n);return Zv(()=>e1(l)?l.canMatch(e,t,r):hn(n,()=>l(e,t,r))).pipe(kM(s))});return tt(a).pipe(ha(),UM(i))}var Gi=class n extends Error{name="NoMatch";segmentGroup;constructor(e){super(),this.segmentGroup=e||null,Object.setPrototypeOf(this,n.prototype)}},nl=class n extends Error{urlTree;name="AbsoluteRedirect";constructor(e){super(),this.urlTree=e,Object.setPrototypeOf(this,n.prototype)}};function f1(n){throw new Ce(4e3,!1)}function h1(n){throw PM(!1,vn.GuardRejected)}var Hv=class{urlSerializer;urlTree;constructor(e,t){this.urlSerializer=e,this.urlTree=t}async lineralizeSegments(e,t){let i=[],r=t.root;for(;;){if(i=i.concat(r.segments),r.numberOfChildren===0)return i;if(r.numberOfChildren>1||!r.children[Ve])throw f1(`${e.redirectTo}`);r=r.children[Ve]}}async applyRedirectCommands(e,t,i,r,s){let o=await p1(t,r,s);if(o instanceof oi)throw new nl(o);let a=this.applyRedirectCreateUrlTree(o,this.urlSerializer.parse(o),e,i);if(o[0]==="/")throw new nl(a);return a}applyRedirectCreateUrlTree(e,t,i,r){let s=this.createSegmentGroup(e,t.root,i,r);return new oi(s,this.createQueryParams(t.queryParams,this.urlTree.queryParams),t.fragment)}createQueryParams(e,t){let i={};return Object.entries(e).forEach(([r,s])=>{if(typeof s=="string"&&s[0]===":"){let a=s.substring(1);i[r]=t[a]}else i[r]=s}),i}createSegmentGroup(e,t,i,r){let s=this.createSegments(e,t.segments,i,r),o=Object.create(null);return Object.entries(t.children).forEach(([a,c])=>{o[a]=this.createSegmentGroup(e,c,i,r)}),new ht(s,o)}createSegments(e,t,i,r){return t.map(s=>s.path[0]===":"?this.findPosParam(e,s,r):this.findOrReturn(s,i))}findPosParam(e,t,i){let r=i[t.path.substring(1)];if(!r)throw new Ce(4001,!1);return r}findOrReturn(e,t){let i=0;for(let r of t){if(r.path===e.path)return t.splice(i),r;i++}return e}};function p1(n,e,t){if(typeof n=="string")return Promise.resolve(n);let i=n;return Zd(rl(hn(t,()=>i(e))))}function m1(n,e){return n.providers&&!n._injector&&(n._injector=Fc(n.providers,e,`Route: ${n.path}`)),n._injector??e}function Wi(n){return n.outlet||Ve}function g1(n,e){let t=n.filter(i=>Wi(i)===e);return t.push(...n.filter(i=>Wi(i)!==e)),t}var zv={matched:!1,consumedSegments:[],remainingSegments:[],parameters:{},positionalParamSegments:{}};function BM(n){return{routeConfig:n.routeConfig,url:n.url,params:n.params,queryParams:n.queryParams,fragment:n.fragment,data:n.data,outlet:n.outlet,title:n.title,paramMap:n.paramMap,queryParamMap:n.queryParamMap}}function v1(n,e,t,i,r,s,o){let a=VM(n,e,t);if(!a.matched)return tt(a);let c=BM(s(a));return i=m1(e,i),d1(i,e,t,r,c,o).pipe(Pt(l=>l===!0?a:he({},zv)))}function VM(n,e,t){if(e.path==="")return e.pathMatch==="full"&&(n.hasChildren()||t.length>0)?he({},zv):{matched:!0,consumedSegments:[],remainingSegments:t,parameters:{},positionalParamSegments:{}};let r=(e.matcher||lM)(t,n,e);if(!r)return he({},zv);let s={};Object.entries(r.posParams??{}).forEach(([a,c])=>{s[a]=c.path});let o=r.consumed.length>0?he(he({},s),r.consumed[r.consumed.length-1].parameters):s;return{matched:!0,consumedSegments:r.consumed,remainingSegments:t.slice(r.consumed.length),parameters:o,positionalParamSegments:r.posParams??{}}}function aM(n,e,t,i){return t.length>0&&x1(n,t,i)?{segmentGroup:new ht(e,_1(i,new ht(t,n.children))),slicedSegments:[]}:t.length===0&&S1(n,t,i)?{segmentGroup:new ht(n.segments,y1(n,t,i,n.children)),slicedSegments:t}:{segmentGroup:new ht(n.segments,n.children),slicedSegments:t}}function y1(n,e,t,i){let r={};for(let s of t)if(vf(n,e,s)&&!i[Wi(s)]){let o=new ht([],{});r[Wi(s)]=o}return he(he({},i),r)}function _1(n,e){let t={};t[Ve]=e;for(let i of n)if(i.path===""&&Wi(i)!==Ve){let r=new ht([],{});t[Wi(i)]=r}return t}function x1(n,e,t){return t.some(i=>vf(n,e,i)&&Wi(i)!==Ve)}function S1(n,e,t){return t.some(i=>vf(n,e,i))}function vf(n,e,t){return(n.hasChildren()||e.length>0)&&t.pathMatch==="full"?!1:t.path===""}function E1(n,e,t){return e.length===0&&!n.hasChildren()}var Gv=class{};async function M1(n,e,t,i,r,s,o,a){return new jv(n,e,t,i,r,o,s,a).recognize()}var b1=31,jv=class{injector;configLoader;rootComponentType;config;urlTree;paramsInheritanceStrategy;urlSerializer;abortSignal;applyRedirects;absoluteRedirectCount=0;allowRedirects=!0;queryParams;constructor(e,t,i,r,s,o,a,c){this.injector=e,this.configLoader=t,this.rootComponentType=i,this.config=r,this.urlTree=s,this.paramsInheritanceStrategy=o,this.urlSerializer=a,this.abortSignal=c,this.applyRedirects=new Hv(this.urlSerializer,this.urlTree),this.queryParams=Object.freeze(he({},this.urlTree.queryParams))}noMatchError(e){return new Ce(4002,`'${e.segmentGroup}'`)}async recognize(){let e=aM(this.urlTree.root,[],[],this.config).segmentGroup,{children:t,rootSnapshot:i}=await this.match(e),r=new Tn(i,t),s=new Kc("",r),o=EM(i,[],this.urlTree.queryParams,this.urlTree.fragment);return o.queryParams=this.urlTree.queryParams,s.url=this.urlSerializer.serialize(o),{state:s,tree:o}}async match(e){let t=new ua([],Object.freeze({}),this.queryParams,this.urlTree.fragment,Object.freeze({}),Ve,this.rootComponentType,null,{},this.injector);try{return{children:await this.processSegmentGroup(this.injector,this.config,e,Ve,t),rootSnapshot:t}}catch(i){if(i instanceof nl)return this.absoluteRedirectCount++,this.absoluteRedirectCount>b1&&(this.allowRedirects=!1),this.urlTree=i.urlTree,this.queryParams=Object.freeze(he({},this.urlTree.queryParams)),this.match(i.urlTree.root);throw i instanceof Gi?this.noMatchError(i):i}}async processSegmentGroup(e,t,i,r,s){if(i.segments.length===0&&i.hasChildren())return this.processChildren(e,t,i,s);let o=await this.processSegment(e,t,i,i.segments,r,!0,s);return o instanceof Tn?[o]:[]}async processChildren(e,t,i,r){let s=[];for(let c of Object.keys(i.children))c==="primary"?s.unshift(c):s.push(c);let o=[];for(let c of s){let l=i.children[c],u=g1(t,c),d=await this.processSegment(e,u,l,l.segments,c,!0,r);d instanceof Tn&&o.push(d)}let a=HM(o);return w1(a),a}async processSegment(e,t,i,r,s,o,a){for(let c of t)try{return await this.processSegmentAgainstRoute(c._injector??e,t,c,i,r,s,o,a)}catch(l){if(l instanceof Gi||LM(l))continue;throw l}if(E1(i,r))return new Gv;throw new Gi(i)}async processSegmentAgainstRoute(e,t,i,r,s,o,a,c){if(Wi(i)!==o&&(o===Ve||!vf(r,s,i)||!i.children?.length&&!i.loadChildren||s.length===0&&!r.hasChildren()))throw new Gi(r);if(i.redirectTo===void 0)return this.matchSegmentAgainstRoute(e,r,i,s,o,c);if(this.allowRedirects&&a)return this.expandSegmentAgainstRouteUsingRedirect(e,r,t,i,s,o,c);throw new Gi(r)}async expandSegmentAgainstRouteUsingRedirect(e,t,i,r,s,o,a){let{matched:c,parameters:l,consumedSegments:u,positionalParamSegments:d,remainingSegments:f}=VM(t,r,s);if(!c)throw new Gi(t);let h=this.createSnapshot(e,r,s,l,a);if(this.abortSignal.aborted)throw new Error(this.abortSignal.reason);let g=await this.applyRedirects.applyRedirectCommands(u,r.redirectTo,d,BM(h),e),x=await this.applyRedirects.lineralizeSegments(r,g);return this.processSegment(e,i,t,x.concat(f),o,!1,a)}createSnapshot(e,t,i,r,s){let o=new ua(i,r,this.queryParams,this.urlTree.fragment,D1(t),Wi(t),t.component??t._loadedComponent??null,t,I1(t),e),a=$v(o,s,this.paramsInheritanceStrategy);return o.params=a.params,o.data=a.data,o}async matchSegmentAgainstRoute(e,t,i,r,s,o){if(this.abortSignal.aborted)throw new Error(this.abortSignal.reason);let a=C=>this.createSnapshot(e,i,C.consumedSegments,C.parameters,o),c=await Zd(v1(t,i,r,e,this.urlSerializer,a,this.abortSignal));if(i.path==="**"&&(t.children={}),!c?.matched)throw new Gi(t);e=i._injector??e;let{routes:l}=await this.getChildConfig(e,i,r),u=i._loadedInjector??e,{parameters:d,consumedSegments:f,remainingSegments:h}=c,g=this.createSnapshot(e,i,f,d,o),x=Wi(i)===s,{segmentGroup:p,slicedSegments:m}=x?aM(t,f,h,l):{segmentGroup:t,slicedSegments:h};if(x&&m.length===0&&p.hasChildren()){let C=await this.processChildren(u,l,p,g);return new Tn(g,C)}if(x&&l.length===0&&m.length===0)return new Tn(g,[]);let S=await this.processSegment(u,l,p,m,x?Ve:s,!0,g);if(!x&&!(S instanceof Tn))throw new Gi(t);return new Tn(g,S instanceof Tn?[S]:[])}async getChildConfig(e,t,i){if(t.children)return{routes:t.children,injector:e};if(t.loadChildren){if(t._loadedRoutes!==void 0){let s=t._loadedNgModuleFactory;return s&&!t._loadedInjector&&(t._loadedInjector=s.create(e).injector),{routes:t._loadedRoutes,injector:t._loadedInjector}}if(this.abortSignal.aborted)throw new Error(this.abortSignal.reason);if(await Zd(u1(e,t,i,this.urlSerializer,this.abortSignal))){let s=await this.configLoader.loadChildren(e,t);return t._loadedRoutes=s.routes,t._loadedInjector=s.injector,t._loadedNgModuleFactory=s.factory,s}throw h1(t)}return{routes:[],injector:e}}};function w1(n){n.sort((e,t)=>e.value.outlet===Ve?-1:t.value.outlet===Ve?1:e.value.outlet.localeCompare(t.value.outlet))}function C1(n){let e=n.value.routeConfig;return e&&e.path===""}function HM(n){let e=[],t=new Set;for(let r of n){if(!C1(r)){e.push(r);continue}let s=e.find(o=>r.value.routeConfig===o.value.routeConfig);s!==void 0?(s.children.push(...r.children),t.add(s)):e.push(r)}for(let r of t){let s=HM(r.children);e.push(new Tn(r.value,s))}let i=e.filter(r=>!t.has(r));return T1(i),i}function T1(n){let e=Object.create(null);n.forEach(t=>{let i=e[t.value.outlet];if(i){let r=i.url.map(o=>o.toString()).join("/"),s=t.value.url.map(o=>o.toString()).join("/");throw new Ce(4006,!1)}e[t.value.outlet]=t.value})}function D1(n){return n.data||{}}function I1(n){return n.resolve||{}}function A1(n,e,t,i,r,s,o){return wn(async a=>{let{state:c,tree:l}=await M1(n,e,t,i,a.extractedUrl,r,s,o);return _t(he({},a),{targetSnapshot:c,urlAfterRedirects:l})})}function R1(n){return wn(e=>{let{targetSnapshot:t,guards:{canActivateChecks:i}}=e;if(!i.length)return tt(e);let r=new Set(i.map(a=>a.route)),s=new Set;for(let a of r)if(!s.has(a))for(let c of zM(a))s.add(c);let o=0;return Vt(s).pipe(Iu(a=>r.has(a)?N1(a,t,n):(a.data=$v(a,a.parent,n).resolve,tt(void 0))),ei(()=>o++),Au(1),wn(a=>o===s.size?tt(e):fn))})}function zM(n){let e=n.children.map(t=>zM(t)).flat();return[n,...e]}function N1(n,e,t){let i=n.routeConfig,r=n._resolve;return i?.title!==void 0&&!IM(i)&&(r[il]=i.title),oc(()=>(n.data=$v(n,n.parent,t).resolve,P1(r,n,e).pipe(Pt(s=>(n._resolvedData=s,n.data=he(he({},n.data),s),null)))))}function P1(n,e,t){let i=Rv(n);if(i.length===0)return tt({});let r={};return Vt(i).pipe(wn(s=>O1(n[s],e,t).pipe(lr(),ei(o=>{if(o instanceof as)throw qc(new os,o);r[s]=o}))),Au(1),Pt(()=>r),Po(s=>LM(s)?fn:Vp(s)))}function O1(n,e,t){let i=e._environmentInjector,r=pa(n,i),s=r.resolve?r.resolve(e,t):hn(i,()=>r(e,t));return rl(s)}var GM=new Pe("");function Wv(n){return Qn(e=>{let t=n(e);return t?Vt(t).pipe(Pt(()=>e)):tt(e)})}var Kv=(()=>{class n{buildTitle(t){let i,r=t.root;for(;r!==void 0;)i=this.getResolvedTitleForRoute(r)??i,r=r.children.find(s=>s.outlet===Ve);return i}getResolvedTitleForRoute(t){return t.data[il]}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:()=>re(jM)})}return n})(),jM=(()=>{class n extends Kv{title;constructor(t){super(),this.title=t}updateTitle(t){let i=this.buildTitle(t);i!==void 0&&this.title.setTitle(i)}static \u0275fac=function(i){return new(i||n)(qe(tM))};static \u0275prov=ut({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})(),cl=new Pe("",{factory:()=>({})}),ll=new Pe(""),WM=(()=>{class n{componentLoaders=new WeakMap;childrenLoaders=new WeakMap;onLoadStartListener;onLoadEndListener;compiler=re(ov);async loadComponent(t,i){if(this.componentLoaders.get(i))return this.componentLoaders.get(i);if(i._loadedComponent)return Promise.resolve(i._loadedComponent);this.onLoadStartListener&&this.onLoadStartListener(i);let r=(async()=>{try{let s=await dM(hn(t,()=>i.loadComponent())),o=await qM(uv(s));return this.onLoadEndListener&&this.onLoadEndListener(i),i._loadedComponent=o,o}finally{this.componentLoaders.delete(i)}})();return this.componentLoaders.set(i,r),r}loadChildren(t,i){if(this.childrenLoaders.get(i))return this.childrenLoaders.get(i);if(i._loadedRoutes)return Promise.resolve({routes:i._loadedRoutes,injector:i._loadedInjector});this.onLoadStartListener&&this.onLoadStartListener(i);let r=(async()=>{try{let s=await $M(i,this.compiler,t,this.onLoadEndListener);return i._loadedRoutes=s.routes,i._loadedInjector=s.injector,i._loadedNgModuleFactory=s.factory,s}finally{this.childrenLoaders.delete(i)}})();return this.childrenLoaders.set(i,r),r}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();async function $M(n,e,t,i){let r=await dM(hn(t,()=>n.loadChildren())),s=await qM(uv(r)),o;s instanceof Pd||Array.isArray(s)?o=s:o=await e.compileModuleAsync(s),i&&i(n);let a,c,l=!1,u;return Array.isArray(o)?(c=o,l=!0):(a=o.create(t).injector,u=o,c=a.get(ll,[],{optional:!0,self:!0}).flat()),{routes:c.map(Yv),injector:a,factory:u}}async function qM(n){return n}var yf=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:()=>re(L1)})}return n})(),L1=(()=>{class n{shouldProcessUrl(t){return!0}extract(t){return t}merge(t,i){return t}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})(),XM=new Pe("");var F1=()=>{},YM=new Pe(""),ZM=(()=>{class n{currentNavigation=Xt(null,{equal:()=>!1});currentTransition=null;lastSuccessfulNavigation=Xt(null);events=new Bt;transitionAbortWithErrorSubject=new Bt;configLoader=re(WM);environmentInjector=re(nn);destroyRef=re(Ai);urlSerializer=re(sl);rootContexts=re(co);location=re(so);inputBindingEnabled=re(gf,{optional:!0})!==null;titleStrategy=re(Kv);options=re(cl,{optional:!0})||{};paramsInheritanceStrategy=this.options.paramsInheritanceStrategy||BN;urlHandlingStrategy=re(yf);createViewTransition=re(XM,{optional:!0});navigationErrorHandler=re(YM,{optional:!0});routerResourcesFeature=re(GM,{optional:!0});navigationId=0;get hasRequestedNavigation(){return this.navigationId!==0}transitions;afterPreactivation=()=>tt(void 0);rootComponentType=null;destroyed=!1;constructor(){let t=r=>this.events.next(new cf(r)),i=r=>this.events.next(new lf(r));this.configLoader.onLoadEndListener=i,this.configLoader.onLoadStartListener=t,this.destroyRef.onDestroy(()=>{this.destroyed=!0})}complete(){this.transitions?.complete()}handleNavigationRequest(t){let i=++this.navigationId;is(()=>{this.transitions?.next(_t(he({},t),{extractedUrl:this.urlHandlingStrategy.extract(t.rawUrl),targetSnapshot:null,targetRouterState:null,guards:{canActivateChecks:[],canDeactivateChecks:[]},guardsResult:null,id:i,routesRecognizeHandler:{},beforeActivateHandler:{}}))})}setupNavigations(t){return this.transitions=new dn(null),this.transitions.pipe(cr(i=>i!==null),Qn(i=>{let r=!0,s=!1,o=new AbortController,a=()=>!s&&this.currentTransition?.id===i.id;return tt(i).pipe(Qn(c=>{if(this.navigationId>i.id)return this.cancelNavigationTransition(i,"",vn.SupersededByNewNavigation),fn;this.currentTransition=i;let l=this.lastSuccessfulNavigation();this.currentNavigation.set({id:c.id,initialUrl:c.rawUrl,extractedUrl:c.extractedUrl,targetBrowserUrl:typeof c.extras.browserUrl=="string"?this.urlSerializer.parse(c.extras.browserUrl):c.extras.browserUrl,trigger:c.source,extras:c.extras,previousNavigation:l?_t(he({},l),{previousNavigation:null}):null,abort:()=>o.abort(),routesRecognizeHandler:c.routesRecognizeHandler,beforeActivateHandler:c.beforeActivateHandler});let u=!t.navigated||this.isUpdatingInternalState()||this.isUpdatedBrowserUrl(),d=c.extras.onSameUrlNavigation??t.onSameUrlNavigation;if(!u&&d!=="reload")return this.events.next(new br(c.id,this.urlSerializer.serialize(c.rawUrl),"",Jc.IgnoredSameUrlNavigation)),c.resolve(!1),fn;if(this.urlHandlingStrategy.shouldProcessUrl(c.rawUrl))return tt(c).pipe(Qn(f=>(this.events.next(new lo(f.id,this.urlSerializer.serialize(f.extractedUrl),f.source,f.restoredState)),f.id!==this.navigationId?fn:Promise.resolve(f))),A1(this.environmentInjector,this.configLoader,this.rootComponentType,t.config,this.urlSerializer,this.paramsInheritanceStrategy,o.signal),ei(f=>{i.targetSnapshot=f.targetSnapshot,i.urlAfterRedirects=f.urlAfterRedirects,this.currentNavigation.update(h=>(h.finalUrl=f.urlAfterRedirects,h)),this.events.next(new el)}),Qn(f=>Vt(i.routesRecognizeHandler.deferredHandle??tt(void 0)).pipe(Pt(()=>f))),ei(()=>{let f=new Qc(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects),c.targetSnapshot);this.events.next(f)}));if(u&&this.urlHandlingStrategy.shouldProcessUrl(c.currentRawUrl)){let{id:f,extractedUrl:h,source:g,restoredState:x,extras:p}=c,m=new lo(f,this.urlSerializer.serialize(h),g,x);this.events.next(m);let S=TM(this.rootComponentType,this.environmentInjector).snapshot;return this.currentTransition=i=_t(he({},c),{targetSnapshot:S,urlAfterRedirects:h,extras:_t(he({},p),{skipLocationChange:!1,replaceUrl:!1})}),this.currentNavigation.update(C=>(C.finalUrl=h,C)),tt(i)}else return this.events.next(new br(c.id,this.urlSerializer.serialize(c.extractedUrl),"",Jc.IgnoredByUrlHandlingStrategy)),c.resolve(!1),fn}),Pt(c=>{let l=new rf(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects),c.targetSnapshot);return this.events.next(l),this.currentTransition=i=_t(he({},c),{guards:WN(c.targetSnapshot,c.currentSnapshot,this.rootContexts)}),i}),n1(c=>this.events.next(c)),Qn(c=>{if(i.guardsResult=c.guardsResult,c.guardsResult&&typeof c.guardsResult!="boolean")throw qc(this.urlSerializer,c.guardsResult);let l=new sf(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects),c.targetSnapshot,!!c.guardsResult);if(this.events.next(l),!a())return fn;if(!c.guardsResult)return this.cancelNavigationTransition(c,"",vn.GuardRejected),fn;if(c.guards.canActivateChecks.length===0)return tt(c);let u=new of(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects),c.targetSnapshot);if(this.events.next(u),!a())return fn;let d=!1;return tt(c).pipe(R1(this.paramsInheritanceStrategy),ei({next:()=>{d=!0;let f=new af(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects),c.targetSnapshot);this.events.next(f)},complete:()=>{d||this.cancelNavigationTransition(c,"",vn.NoDataFromResolver)}}))}),Wv(c=>{let l=d=>{let f=[];if(d.routeConfig?._loadedComponent)d.component=d.routeConfig?._loadedComponent;else if(d.routeConfig?.loadComponent){let h=d._environmentInjector;f.push(this.configLoader.loadComponent(h,d.routeConfig).then(g=>{d.component=g}))}for(let h of d.children)f.push(...l(h));return f},u=l(c.targetSnapshot.root);return u.length===0?tt(c):Vt(Promise.all(u).then(()=>c))}),Qn(c=>{let{newlyCreatedRoutes:l,state:u}=HN(t.routeReuseStrategy,c.targetSnapshot,c.currentRouterState);return this.currentTransition=i=c=_t(he({},c),{targetRouterState:u,newlyCreatedRoutes:l}),this.currentNavigation.update(d=>(d.targetRouterState=u,d)),tt(c)}),this.routerResourcesFeature?.setupAndRunResources(o.signal)??(c=>c),Wv(()=>this.afterPreactivation()),Qn(()=>{let{currentSnapshot:c,targetSnapshot:l}=i,u=this.createViewTransition?.(this.environmentInjector,c.root,l.root,i.hasUAVisualTransition);return u?Vt(u).pipe(Pt(()=>i)):tt(i)}),jr(1),Qn(c=>{r=!1,this.events.next(new da);let l=i.beforeActivateHandler.deferredHandle;return l?Vt(l.then(()=>c)):tt(c)}),ei(c=>{new Vv(t.routeReuseStrategy,i.targetRouterState,i.currentRouterState,l=>this.events.next(l),this.inputBindingEnabled).activate(this.rootContexts),c.newlyCreatedRoutes?.clear(),a()&&(KM(c.targetRouterState),s=!0,this.currentNavigation.update(l=>(l.abort=F1,l)),this.lastSuccessfulNavigation.set(is(this.currentNavigation)),this.events.next(new Mr(c.id,this.urlSerializer.serialize(c.extractedUrl),this.urlSerializer.serialize(c.urlAfterRedirects))),this.titleStrategy?.updateTitle(c.targetRouterState.snapshot),c.resolve(!0))}),ac(FM(o.signal).pipe(cr(()=>!s&&r),ei(()=>{this.cancelNavigationTransition(i,o.signal.reason+"",vn.Aborted)}))),ei({complete:()=>{s=!0}}),ac(this.transitionAbortWithErrorSubject.pipe(ei(c=>{throw c}))),zp(()=>{o.abort(),s||this.cancelNavigationTransition(i,"",vn.SupersededByNewNavigation),this.currentTransition?.id===i.id&&(this.currentNavigation.set(null),this.currentTransition=null)}),Po(c=>{if(s=!0,cM(i),this.destroyed)return i.resolve(!1),fn;if(c instanceof as&&(c=qc(this.urlSerializer,c)),OM(c))this.events.next(new si(i.id,this.urlSerializer.serialize(i.extractedUrl),c.message,c.cancellationCode)),jN(c)?this.events.next(new fa(c.url,c.navigationBehaviorOptions)):i.resolve(!1);else{let l=new uo(i.id,this.urlSerializer.serialize(i.extractedUrl),c,i.targetSnapshot??void 0);try{let u=hn(this.environmentInjector,()=>this.navigationErrorHandler?.(l));if(u instanceof as){let{message:d,cancellationCode:f}=qc(this.urlSerializer,u);this.events.next(new si(i.id,this.urlSerializer.serialize(i.extractedUrl),d,f)),this.events.next(new fa(u.redirectTo,u.navigationBehaviorOptions))}else throw this.events.next(l),c}catch(u){this.options.resolveNavigationPromiseOnError?i.resolve(!1):i.reject(u)}}return fn}))}))}cancelNavigationTransition(t,i,r){cM(t);let s=new si(t.id,this.urlSerializer.serialize(t.extractedUrl),i,r);this.events.next(s),t.resolve(!1)}isUpdatingInternalState(){return this.currentTransition?.extractedUrl.toString()!==this.currentTransition?.currentUrlTree.toString()}isUpdatedBrowserUrl(){let t=this.urlHandlingStrategy.extract(this.urlSerializer.parse(this.location.path(!0))),i=is(this.currentNavigation),r=i?.targetBrowserUrl??i?.extractedUrl;return t.toString()!==r?.toString()&&!i?.extras.skipLocationChange}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function k1(n){return n!==$c}function cM(n){for(let e of n.newlyCreatedRoutes??[])e._localInjector?.destroy(),e._localInjector=void 0;KM(n.targetRouterState)}function KM(n){if(!n)return;let e=t=>{t.value.pending?.set(!1),t.children.forEach(e)};e(n._root)}var JM=new Pe("");var QM=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:()=>re(U1)})}return n})(),mf=class{shouldDetach(e){return!1}store(e,t){}shouldAttach(e){return!1}retrieve(e){return null}shouldReuseRoute(e,t){return e.routeConfig===t.routeConfig}shouldDestroyInjector(e){return!0}},U1=(()=>{class n extends mf{static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})(),Jv=(()=>{class n{urlSerializer=re(sl);options=re(cl,{optional:!0})||{};canceledNavigationResolution=this.options.canceledNavigationResolution||"replace";location=re(so);urlHandlingStrategy=re(yf);urlUpdateStrategy=this.options.urlUpdateStrategy||"deferred";currentUrlTree=new oi;getCurrentUrlTree(){return this.currentUrlTree}rawUrlTree=this.currentUrlTree;getRawUrlTree(){return this.rawUrlTree}createBrowserPath({finalUrl:t,initialUrl:i,targetBrowserUrl:r}){let s=t!==void 0?this.urlHandlingStrategy.merge(t,i):i,o=r??s;return o instanceof oi?this.urlSerializer.serialize(o):o}routerUrlState(t){return t?.targetBrowserUrl===void 0||t?.finalUrl===void 0?{}:{\u0275routerUrl:this.urlSerializer.serialize(t.finalUrl)}}commitTransition({targetRouterState:t,finalUrl:i,initialUrl:r}){i&&t?(this.currentUrlTree=i,this.rawUrlTree=this.urlHandlingStrategy.merge(i,r),this.routerState=t):this.rawUrlTree=r}routerState=TM(null,re(nn));getRouterState(){return this.routerState}_stateMemento=this.createStateMemento();get stateMemento(){return this._stateMemento}updateStateMemento(){this._stateMemento=this.createStateMemento()}createStateMemento(){return{rawUrlTree:this.rawUrlTree,currentUrlTree:this.currentUrlTree,routerState:this.routerState}}restoredState(){return this.location.getState()}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:()=>re(B1)})}return n})(),B1=(()=>{class n extends Jv{currentPageId=0;lastSuccessfulId=-1;get browserPageId(){return this.canceledNavigationResolution!=="computed"?this.currentPageId:this.restoredState()?.\u0275routerPageId??this.currentPageId}registerNonRouterCurrentEntryChangeListener(t){return this.location.subscribe(i=>{i.type==="popstate"&&setTimeout(()=>{t(i.url,i.state,"popstate",{replaceUrl:!0},i.hasUAVisualTransition)})})}handleRouterEvent(t,i){t instanceof lo?this.updateStateMemento():t instanceof br?this.commitTransition(i):t instanceof Qc?this.urlUpdateStrategy==="eager"&&(i.extras.skipLocationChange||this.setBrowserUrl(this.createBrowserPath(i),i)):t instanceof da?(this.commitTransition(i),this.urlUpdateStrategy==="deferred"&&!i.extras.skipLocationChange&&this.setBrowserUrl(this.createBrowserPath(i),i)):t instanceof si?RM(t)?t.code===vn.Redirect&&this.routerState===i.targetRouterState&&this.resetInternalState(i):this.restoreHistory(i):t instanceof uo?this.restoreHistory(i,!0):t instanceof Mr&&(this.lastSuccessfulId=t.id,this.currentPageId=this.browserPageId)}setBrowserUrl(t,i){let{extras:r,id:s}=i,{replaceUrl:o,state:a}=r;if(this.location.isCurrentPathEqualTo(t)||o){let c=this.browserPageId,l=he(he({},a),this.generateNgRouterState(s,c,i));this.location.replaceState(t,"",l)}else{let c=he(he({},a),this.generateNgRouterState(s,this.browserPageId+1,i));this.location.go(t,"",c)}}restoreHistory(t,i=!1){if(this.canceledNavigationResolution==="computed"){let r=this.browserPageId,s=this.currentPageId-r;s!==0?this.location.historyGo(s):this.getCurrentUrlTree()===t.finalUrl&&s===0&&(this.resetInternalState(t),this.resetUrlToCurrentUrlTree())}else this.canceledNavigationResolution==="replace"&&(i&&this.resetInternalState(t),this.resetUrlToCurrentUrlTree())}resetInternalState({finalUrl:t}){this.routerState=this.stateMemento.routerState,this.currentUrlTree=this.stateMemento.currentUrlTree,this.rawUrlTree=this.urlHandlingStrategy.merge(this.currentUrlTree,t??this.rawUrlTree)}resetUrlToCurrentUrlTree(){this.location.replaceState(this.urlSerializer.serialize(this.getRawUrlTree()),"",this.generateNgRouterState(this.lastSuccessfulId,this.currentPageId))}generateNgRouterState(t,i,r){return this.canceledNavigationResolution==="computed"?he({navigationId:t,\u0275routerPageId:i},this.routerUrlState(r)):he({navigationId:t},this.routerUrlState(r))}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function Qv(n,e){n.events.pipe(cr(t=>t instanceof Mr||t instanceof si||t instanceof uo||t instanceof br),Pt(t=>t instanceof Mr||t instanceof br?0:(t instanceof si?t.code===vn.Redirect||t.code===vn.SupersededByNewNavigation:!1)?2:1),cr(t=>t!==2),jr(1)).subscribe(()=>{e()})}var qi=(()=>{class n{get currentUrlTree(){return this.stateManager.getCurrentUrlTree()}get rawUrlTree(){return this.stateManager.getRawUrlTree()}disposed=!1;nonRouterCurrentEntryChangeSubscription;console=re(Qg);stateManager=re(Jv);options=re(cl,{optional:!0})||{};pendingTasks=re(Zr);urlUpdateStrategy=this.options.urlUpdateStrategy||"deferred";navigationTransitions=re(ZM);urlSerializer=re(sl);location=re(so);urlHandlingStrategy=re(yf);injector=re(nn);_events=new Bt;get events(){return this._events}get routerState(){return this.stateManager.getRouterState()}navigated=!1;routeReuseStrategy=re(QM);injectorCleanup=re(JM,{optional:!0});onSameUrlNavigation=this.options.onSameUrlNavigation||"ignore";config=re(ll,{optional:!0})?.flat()??[];componentInputBindingEnabled=!!re(gf,{optional:!0});currentNavigation=this.navigationTransitions.currentNavigation.asReadonly();constructor(){this.resetConfig(this.config),this.navigationTransitions.setupNavigations(this).subscribe({error:t=>{}}),this.subscribeToNavigationEvents()}eventsSubscription=new un;subscribeToNavigationEvents(){let t=this.navigationTransitions.events.subscribe(i=>{try{let r=this.navigationTransitions.currentTransition,s=is(this.navigationTransitions.currentNavigation);if(r!==null&&s!==null){if(this.stateManager.handleRouterEvent(i,s),i instanceof si&&i.code!==vn.Redirect&&i.code!==vn.SupersededByNewNavigation)this.navigated=!0;else if(i instanceof Mr)this.navigated=!0,this.injectorCleanup?.(this.routeReuseStrategy,this.routerState,this.config);else if(i instanceof fa){let o=i.navigationBehaviorOptions,a=this.urlHandlingStrategy.merge(i.url,r.currentRawUrl),c=he({scroll:r.extras.scroll,browserUrl:r.extras.browserUrl,info:r.extras.info,skipLocationChange:r.extras.skipLocationChange,replaceUrl:r.extras.replaceUrl||this.urlUpdateStrategy==="eager"||k1(r.source)},o);this.scheduleNavigation(a,$c,null,c,r.hasUAVisualTransition,{resolve:r.resolve,reject:r.reject,promise:r.promise})}}VN(i)&&this._events.next(i)}catch(r){this.navigationTransitions.transitionAbortWithErrorSubject.next(r)}});this.eventsSubscription.add(t)}resetRootComponentType(t){this.routerState.root.component=t,this.navigationTransitions.rootComponentType=t}initialNavigation(){this.setUpLocationChangeListener(),this.navigationTransitions.hasRequestedNavigation||this.navigateToSyncWithBrowser(this.location.path(!0),$c,this.stateManager.restoredState(),{replaceUrl:!0})}setUpLocationChangeListener(){this.nonRouterCurrentEntryChangeSubscription??=this.stateManager.registerNonRouterCurrentEntryChangeListener((t,i,r,s,o)=>{this.navigateToSyncWithBrowser(t,r,i,s,o)})}navigateToSyncWithBrowser(t,i,r,s,o){let a=r?.navigationId?r:null,c=r?.\u0275routerUrl??t;if(r?.\u0275routerUrl&&(s=_t(he({},s),{browserUrl:t})),r){let u=he({},r);delete u.navigationId,delete u.\u0275routerPageId,delete u.\u0275routerUrl,Object.keys(u).length!==0&&(s.state=u)}let l=this.parseUrl(c);this.scheduleNavigation(l,i,a,s,o).catch(u=>{this.disposed||this.injector.get(ki)(u)})}get url(){return this.serializeUrl(this.currentUrlTree)}getCurrentNavigation(){return is(this.navigationTransitions.currentNavigation)}get lastSuccessfulNavigation(){return this.navigationTransitions.lastSuccessfulNavigation}resetConfig(t){this.config=t.map(Yv),this.navigated=!1}ngOnDestroy(){this.dispose()}dispose(){this._events.unsubscribe(),this.navigationTransitions.complete(),this.nonRouterCurrentEntryChangeSubscription?.unsubscribe(),this.nonRouterCurrentEntryChangeSubscription=void 0,this.disposed=!0,this.eventsSubscription.unsubscribe()}createUrlTree(t,i={}){let{relativeTo:r,queryParams:s,fragment:o,queryParamsHandling:a,preserveFragment:c}=i,l=c?this.currentUrlTree.fragment:o,u=null;switch(a??this.options.defaultQueryParamsHandling){case"merge":u=he(he({},this.currentUrlTree.queryParams),s);break;case"preserve":u=this.currentUrlTree.queryParams;break;default:u=s||null}let d;try{let f=r?r.snapshot:this.routerState.snapshot.root;d=MM(f)}catch{(typeof t[0]!="string"||t[0][0]!=="/")&&(t=[]),d=this.currentUrlTree.root}return bM(d,t,u,l??null,this.urlSerializer)}navigateByUrl(t,i={skipLocationChange:!1}){let r=la(t)?t:this.parseUrl(t),s=this.urlHandlingStrategy.merge(r,this.rawUrlTree);return this.scheduleNavigation(s,$c,null,i)}navigate(t,i={skipLocationChange:!1}){return V1(t),this.navigateByUrl(this.createUrlTree(t,i),i)}serializeUrl(t){return this.urlSerializer.serialize(t)}parseUrl(t){try{return this.urlSerializer.parse(t)}catch{return this.console.warn(dc(4018,!1)),this.urlSerializer.parse("/")}}isActive(t,i){let r;if(i===!0?r=he({},hM):i===!1?r=he({},Kd):r=he(he({},Kd),i),la(t))return Nv(this.currentUrlTree,t,r);let s=this.parseUrl(t);return Nv(this.currentUrlTree,s,r)}scheduleNavigation(t,i,r,s,o,a){if(this.disposed)return Promise.resolve(!1);let c,l,u;a?(c=a.resolve,l=a.reject,u=a.promise):u=new Promise((f,h)=>{c=f,l=h});let d=this.pendingTasks.add();return Qv(this,()=>{queueMicrotask(()=>this.pendingTasks.remove(d))}),this.navigationTransitions.handleNavigationRequest({source:i,restoredState:r,currentUrlTree:this.currentUrlTree,currentRawUrl:this.currentUrlTree,rawUrl:t,extras:s,hasUAVisualTransition:o,resolve:c,reject:l,promise:u,currentSnapshot:this.routerState.snapshot,currentRouterState:this.routerState}),u.catch(Promise.reject.bind(Promise))}static \u0275fac=function(i){return new(i||n)};static \u0275prov=Yt({token:n,factory:n.\u0275fac})}return n})();function V1(n){for(let e=0;e<n.length;e++)if(n[e]==null)throw new Ce(4008,!1)}var G1=new Pe("");function ey(n,...e){return Hs([{provide:ll,multi:!0,useValue:n},{provide:$i,useFactory:j1},{provide:Ld,multi:!0,useFactory:$1},e.map(t=>t.\u0275providers)])}function j1(){return re(qi).routerState.root}function W1(n,e){return{\u0275kind:n,\u0275providers:e}}function $1(){let n=re(fi);return e=>{let t=n.get(na);if(e!==t.components[0])return;let i=n.get(qi),r=n.get(q1);n.get(X1)===1&&i.initialNavigation(),n.get(Y1,null,{optional:!0})?.setUpPreloading(),n.get(G1,null,{optional:!0})?.init(),i.resetRootComponentType(t.componentTypes[0]),r.closed||(r.next(),r.complete(),r.unsubscribe())}}var q1=new Pe("",{factory:()=>new Bt}),X1=new Pe("",{factory:()=>1});var Y1=new Pe("");function ty(){return W1(6,[{provide:rs,useClass:mv}])}var wr=[{id:"ana",name:"Ana",initial:"A",color:3120727},{id:"bruno",name:"Bruno",initial:"B",color:14709036},{id:"clara",name:"Clara",initial:"C",color:10181590}],ny=[{id:"teste-12x12",name:"Campo de teste",subtitle:"Mapa 12\xD712 \xB7 teste de movimenta\xE7\xE3o",cols:12,rows:12,available:!0,starts:[{col:5,row:6},{col:4,row:7},{col:6,row:7}]},{id:"missao-1-hangar",name:"Miss\xE3o 1 \xB7 Hangar",subtitle:"Em breve",cols:27,rows:11,available:!1,starts:[{col:2,row:6},{col:1,row:5},{col:1,row:7}]}],_f=n=>ny.find(e=>e.id===n&&e.available),ma={count:2,sides:4};var K1=()=>[0,1,2,3,4,5,6],J1=(n,e)=>e.id;function Q1(n,e){n&1&&yi(0,"span",12)}function eP(n,e){n&1&&Je(0," Bloqueado ")}function tP(n,e){n&1&&Je(0," Selecionado ")}function nP(n,e){n&1&&Je(0," Tocar para escolher ")}function iP(n,e){if(n&1){let t=ts();Ie(0,"li")(1,"button",10),Hn("click",function(){let r=Li(t).$implicit,s=Gt();return Fi(s.choose(r))}),Ie(2,"span",11),Qr(3,Q1,1,0,"span",12,nv),ke(),Ie(5,"span",13)(6,"span",14),Je(7),ke(),Ie(8,"span",15),Je(9),ke()(),Ie(10,"span",16),Bi(11,eP,1,0)(12,tP,1,0)(13,nP,1,0),ke()()()}if(n&2){let t=e.$implicit,i=Gt();Ke(),ns("selected",i.selectedId()===t.id)("locked",!t.available),to("disabled",!t.available),eo("aria-pressed",i.selectedId()===t.id),Ke(2),es(sv(9,K1)),Ke(4),gn(t.name),Ke(2),gn(t.subtitle),Ke(2),Vi(t.available?i.selectedId()===t.id?12:13:11)}}var xf=class n{router=re(qi);maps=ny;selectedId=Xt(null);choose(e){e.available&&this.selectedId.set(e.id)}start(){let e=this.selectedId();e&&this.router.navigate(["/jogo",e])}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=xr({type:n,selectors:[["app-start-screen"]],decls:18,vars:1,consts:[[1,"start"],[1,"title"],["aria-hidden","true",1,"badge"],["viewBox","0 0 100 100"],["points","25,6 75,6 98,50 75,94 25,94 2,50"],["aria-labelledby","maps-title",1,"maps"],["id","maps-title"],["role","list"],[1,"actions"],["type","button",1,"btn","btn-primary","start-btn",3,"click","disabled"],["type","button",1,"map-card",3,"click","disabled"],["aria-hidden","true",1,"thumb"],[1,"mini-hex"],[1,"info"],[1,"name"],[1,"sub"],[1,"state"]],template:function(t,i){t&1&&(Ie(0,"main",0)(1,"header",1)(2,"div",2),gr(),Ie(3,"svg",3),yi(4,"polygon",4),ke()(),vr(),Ie(5,"h1"),Je(6,"Jogo do Ibama"),ke(),Ie(7,"p"),Je(8,"Opera\xE7\xF5es t\xE1ticas contra crimes ambientais"),ke()(),Ie(9,"section",5)(10,"h2",6),Je(11,"Escolha o mapa"),ke(),Ie(12,"ul",7),Qr(13,iP,14,10,"li",null,J1),ke()(),Ie(15,"footer",8)(16,"button",9),Hn("click",function(){return i.start()}),Je(17," Iniciar "),ke()()()),t&2&&(Ke(13),es(i.maps),Ke(3),to("disabled",!i.selectedId()))},styles:["[_nghost-%COMP%]{display:block;min-height:100dvh}.start[_ngcontent-%COMP%]{min-height:100dvh;max-width:560px;margin:0 auto;padding:calc(24px + var(--%NS%safe-top)) calc(16px + var(--%NS%safe-right)) calc(20px + var(--%NS%safe-bottom)) calc(16px + var(--%NS%safe-left));display:flex;flex-direction:column;gap:24px}.title[_ngcontent-%COMP%]{text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4vh}.badge[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{width:72px;height:72px}.badge[_ngcontent-%COMP%]   polygon[_ngcontent-%COMP%]{fill:var(--%NS%yellow);stroke:var(--%NS%ink);stroke-width:7}h1[_ngcontent-%COMP%]{margin:0;font-family:var(--%NS%display);font-weight:400;font-size:clamp(38px,11vw,56px);line-height:1;text-shadow:0 4px 0 var(--%NS%ink)}.title[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:0;color:var(--%NS%muted);font-size:15px}.maps[_ngcontent-%COMP%]{flex:1}h2[_ngcontent-%COMP%]{margin:0 0 12px;font-family:var(--%NS%display);font-weight:400;font-size:22px;color:var(--%NS%yellow)}ul[_ngcontent-%COMP%]{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.map-card[_ngcontent-%COMP%]{width:100%;min-height:88px;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:14px;align-items:center;text-align:left;padding:12px 14px;border-radius:18px;border:4px solid var(--%NS%ink);background:var(--%NS%panel);color:var(--%NS%text);box-shadow:0 5px 0 var(--%NS%ink)}.map-card.selected[_ngcontent-%COMP%]{background:var(--%NS%yellow);color:var(--%NS%dark-text)}.map-card.locked[_ngcontent-%COMP%]{opacity:.55}.thumb[_ngcontent-%COMP%]{grid-row:1 / 3;width:64px;height:56px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;align-content:center}.mini-hex[_ngcontent-%COMP%]{aspect-ratio:1.15;background:#2f78c4;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}.mini-hex[_ngcontent-%COMP%]:nth-child(2n){transform:translateY(40%)}.locked[_ngcontent-%COMP%]   .mini-hex[_ngcontent-%COMP%]{background:#4f6970}.info[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:2px}.name[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-size:22px}.sub[_ngcontent-%COMP%]{font-size:13px;opacity:.85}.state[_ngcontent-%COMP%]{font-size:12px;text-transform:uppercase;letter-spacing:.6px;opacity:.8}.actions[_ngcontent-%COMP%]{display:flex;justify-content:center}.start-btn[_ngcontent-%COMP%]{width:100%;max-width:360px;min-height:64px;font-size:28px}"]})};var iy=(n,e=Math.random)=>1+Math.min(n-1,Math.floor(e()*n)),eb=(n,e,t=Math.random)=>Array.from({length:n},()=>iy(e,t)),ry=n=>n.reduce((e,t)=>e+t,0);var Rb=0,Ly=1,Nb=2;var Vl=1,Th=2,za=3,Ss=0,An=1,tr=2,yo=0,Ga=1,Fy=2,ky=3,Uy=4,Pb=5;var _o=100,Ob=101,Lb=102,Fb=103,kb=104,Ub=200,Bb=201,Vb=202,Hb=203,By=204,Vy=205,zb=206,Gb=207,jb=208,Wb=209,$b=210,qb=211,Xb=212,Yb=213,Zb=214,Xf=0,Yf=1,Zf=2,Ra=3,Kf=4,Jf=5,Qf=6,eh=7,Hy=0,Kb=1,Jb=2,nr=0,zy=1,Gy=2,jy=3,Wy=4,$y=5,qy=6,Xy=7;var Yy=300,xo=301,ja=302,Dh=303,Ih=304,th=1e3,Yi=1001,nh=1002,on=1003,Qb=1004;var Hl=1005;var In=1006,Ah=1007;var Ur=1008;var kn=1009,Zy=1010,Ky=1011,Wa=1012,Rh=1013,bi=1014,wi=1015,Ci=1016,Nh=1017,Ph=1018,So=1020,Jy=35902,Qy=35899,e_=1021,t_=1022,Ti=1023,Or=1026,Br=1027,n_=1028,Oh=1029,Es=1030,Lh=1031;var Fh=1033,zl=33776,Gl=33777,jl=33778,Wl=33779,kh=35840,Uh=35841,Bh=35842,Vh=35843,Hh=36196,zh=37492,Gh=37496,jh=37488,Wh=37489,$l=37490,$h=37491,qh=37808,Xh=37809,Yh=37810,Zh=37811,Kh=37812,Jh=37813,Qh=37814,ep=37815,tp=37816,np=37817,ip=37818,rp=37819,sp=37820,op=37821,ap=36492,cp=36494,lp=36495,up=36283,dp=36284,ql=36285,fp=36286;var vl=2300,ih=2301,$f=2302,Ty=2303,Dy=2400,Iy=2401,Ay=2402;var ew=3200;var hp=0,tw=1,Vr="",Wn="srgb",yl="srgb-linear",_l="linear",gt="srgb";var qf=7680;var nw=519,iw=512,rw=513,sw=514,i_=515,ow=516,aw=517,r_=518,s_=519,cw=35044;var o_="300 es",ci=2e3,Na=2001;function rP(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function sP(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function xl(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function lw(){let n=xl("canvas");return n.style.display="block",n}var tb={},Pa=null;function a_(...n){let e="THREE."+n.shift();Pa?Pa("log",e,...n):console.log(e,...n)}function uw(n){let e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function Ae(...n){n=uw(n);let e="THREE."+n.shift();if(Pa)Pa("warn",e,...n);else{let t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function Fe(...n){n=uw(n);let e="THREE."+n.shift();if(Pa)Pa("error",e,...n);else{let t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function ml(...n){let e=n.join(" ");e in tb||(tb[e]=!0,Ae(...n))}function dw(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}var fw={[Xf]:Xf,[Zf]:Qf,[Kf]:Kf,[Ra]:Jf,[Yf]:Yf,[Qf]:Zf,[eh]:eh,[Jf]:Ra},Ki=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){let i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){let i=this._listeners;if(i===void 0)return;let r=i[e];if(r!==void 0){let s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let i=t[e.type];if(i!==void 0){e.target=this;let r=i.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}},Sn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],nb=1234567,Ia=Math.PI/180,Oa=180/Math.PI;function $a(){let n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Sn[n&255]+Sn[n>>8&255]+Sn[n>>16&255]+Sn[n>>24&255]+"-"+Sn[e&255]+Sn[e>>8&255]+"-"+Sn[e>>16&15|64]+Sn[e>>24&255]+"-"+Sn[t&63|128]+Sn[t>>8&255]+"-"+Sn[t>>16&255]+Sn[t>>24&255]+Sn[i&255]+Sn[i>>8&255]+Sn[i>>16&255]+Sn[i>>24&255]).toLowerCase()}function at(n,e,t){return Math.max(e,Math.min(t,n))}function c_(n,e){return(n%e+e)%e}function oP(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function aP(n,e,t){return n!==e?(t-n)/(e-n):0}function gl(n,e,t){return(1-t)*n+t*e}function cP(n,e,t,i){return gl(n,e,1-Math.exp(-t*i))}function lP(n,e=1){return e-Math.abs(c_(n,e*2)-e)}function uP(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function dP(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function fP(n,e){return n+Math.floor(Math.random()*(e-n+1))}function hP(n,e){return n+Math.random()*(e-n)}function pP(n){return n*(.5-Math.random())}function mP(n){n!==void 0&&(nb=n);let e=nb+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function gP(n){return n*Ia}function vP(n){return n*Oa}function yP(n){return n>0&&Number.isInteger(n)&&2**Math.round(Math.log2(n))===n}function _P(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function l_(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function xP(n,e,t,i,r){let s=Math.cos,o=Math.sin,a=s(t/2),c=o(t/2),l=s((e+i)/2),u=o((e+i)/2),d=s((e-i)/2),f=o((e-i)/2),h=s((i-e)/2),g=o((i-e)/2);switch(r){case"XYX":n.set(a*u,c*d,c*f,a*l);break;case"YZY":n.set(c*f,a*u,c*d,a*l);break;case"ZXZ":n.set(c*d,c*f,a*u,a*l);break;case"XZX":n.set(a*u,c*g,c*h,a*l);break;case"YXY":n.set(c*h,a*u,c*g,a*l);break;case"ZYZ":n.set(c*g,c*h,a*u,a*l);break;default:Ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function u_(n){switch(n.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function hw(n,e){if(e.constructor===Float32Array)return n;let t=u_(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(n/t,-1)}function pw(n,e){if(e.constructor===Float32Array)return n;let t=u_(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(n*t)}var qa={DEG2RAD:Ia,RAD2DEG:Oa,generateUUID:$a,clamp:at,euclideanModulo:c_,mapLinear:oP,inverseLerp:aP,lerp:gl,damp:cP,pingpong:lP,smoothstep:uP,smootherstep:dP,randInt:fP,randFloat:hP,randFloatSpread:pP,seededRandom:mP,degToRad:gP,radToDeg:vP,isPowerOfTwo:yP,ceilPowerOfTwo:_P,floorPowerOfTwo:l_,setQuaternionFromProperEuler:xP,normalize:pw,denormalize:hw},et=class{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(at(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(at(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*i-o*r+e.x,this.y=s*r+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ji=class{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,o,a){let c=i[r+0],l=i[r+1],u=i[r+2],d=i[r+3],f=s[o+0],h=s[o+1],g=s[o+2],x=s[o+3];if(d!==x||c!==f||l!==h||u!==g){let p=c*f+l*h+u*g+d*x;p<0&&(f=-f,h=-h,g=-g,x=-x,p=-p);let m=1-a;if(p<.9995){let S=Math.acos(p),C=Math.sin(S);m=Math.sin(m*S)/C,a=Math.sin(a*S)/C,c=c*m+f*a,l=l*m+h*a,u=u*m+g*a,d=d*m+x*a}else{c=c*m+f*a,l=l*m+h*a,u=u*m+g*a,d=d*m+x*a;let S=1/Math.sqrt(c*c+l*l+u*u+d*d);c*=S,l*=S,u*=S,d*=S}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,r,s,o){let a=i[r],c=i[r+1],l=i[r+2],u=i[r+3],d=s[o],f=s[o+1],h=s[o+2],g=s[o+3];return e[t]=a*g+u*d+c*h-l*f,e[t+1]=c*g+u*f+l*d-a*h,e[t+2]=l*g+u*h+a*f-c*d,e[t+3]=u*g-a*d-c*f-l*h,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(i/2),u=a(r/2),d=a(s/2),f=c(i/2),h=c(r/2),g=c(s/2);switch(o){case"XYZ":this._x=f*u*d+l*h*g,this._y=l*h*d-f*u*g,this._z=l*u*g+f*h*d,this._w=l*u*d-f*h*g;break;case"YXZ":this._x=f*u*d+l*h*g,this._y=l*h*d-f*u*g,this._z=l*u*g-f*h*d,this._w=l*u*d+f*h*g;break;case"ZXY":this._x=f*u*d-l*h*g,this._y=l*h*d+f*u*g,this._z=l*u*g+f*h*d,this._w=l*u*d-f*h*g;break;case"ZYX":this._x=f*u*d-l*h*g,this._y=l*h*d+f*u*g,this._z=l*u*g-f*h*d,this._w=l*u*d+f*h*g;break;case"YZX":this._x=f*u*d+l*h*g,this._y=l*h*d+f*u*g,this._z=l*u*g-f*h*d,this._w=l*u*d-f*h*g;break;case"XZY":this._x=f*u*d-l*h*g,this._y=l*h*d-f*u*g,this._z=l*u*g+f*h*d,this._w=l*u*d+f*h*g;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],r=t[4],s=t[8],o=t[1],a=t[5],c=t[9],l=t[2],u=t[6],d=t[10],f=i+a+d;if(f>0){let h=.5/Math.sqrt(f+1);this._w=.25/h,this._x=(u-c)*h,this._y=(s-l)*h,this._z=(o-r)*h}else if(i>a&&i>d){let h=2*Math.sqrt(1+i-a-d);this._w=(u-c)/h,this._x=.25*h,this._y=(r+o)/h,this._z=(s+l)/h}else if(a>d){let h=2*Math.sqrt(1+a-i-d);this._w=(s-l)/h,this._x=(r+o)/h,this._y=.25*h,this._z=(c+u)/h}else{let h=2*Math.sqrt(1+d-i-a);this._w=(o-r)/h,this._x=(s+l)/h,this._y=(c+u)/h,this._z=.25*h}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(at(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,r=e._y,s=e._z,o=e._w,a=t._x,c=t._y,l=t._z,u=t._w;return this._x=i*u+o*a+r*l-s*c,this._y=r*u+o*c+s*a-i*l,this._z=s*u+o*l+i*c-r*a,this._w=o*u-i*a-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){let i=e._x,r=e._y,s=e._z,o=e._w,a=this.dot(e);a<0&&(i=-i,r=-r,s=-s,o=-o,a=-a);let c=1-t;if(a<.9995){let l=Math.acos(a),u=Math.sin(l);c=Math.sin(c*l)/u,t=Math.sin(t*l)/u,this._x=this._x*c+i*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+o*t,this._onChangeCallback()}else this._x=this._x*c+i*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+o*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},L=class{static{this.prototype.isVector3=!0}constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ib.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ib.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,i=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*o,this}applyQuaternion(e){let t=this.x,i=this.y,r=this.z,s=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*r-a*i),u=2*(a*t-s*r),d=2*(s*i-o*t);return this.x=t+c*l+o*d-a*u,this.y=i+c*u+a*l-s*d,this.z=r+c*d+s*u-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(at(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let i=e.x,r=e.y,s=e.z,o=t.x,a=t.y,c=t.z;return this.x=r*c-s*a,this.y=s*o-i*c,this.z=i*a-r*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return sy.copy(this).projectOnVector(e),this.sub(sy)}reflect(e){return this.sub(sy.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(at(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){let r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},sy=new L,ib=new Ji,Ue=class{static{this.prototype.isMatrix3=!0}constructor(e,t,i,r,s,o,a,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l)}set(e,t,i,r,s,o,a,c,l){let u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=c,u[6]=i,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],u=i[4],d=i[7],f=i[2],h=i[5],g=i[8],x=r[0],p=r[3],m=r[6],S=r[1],C=r[4],b=r[7],T=r[2],w=r[5],v=r[8];return s[0]=o*x+a*S+c*T,s[3]=o*p+a*C+c*w,s[6]=o*m+a*b+c*v,s[1]=l*x+u*S+d*T,s[4]=l*p+u*C+d*w,s[7]=l*m+u*b+d*v,s[2]=f*x+h*S+g*T,s[5]=f*p+h*C+g*w,s[8]=f*m+h*b+g*v,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8];return t*o*u-t*a*l-i*s*u+i*a*c+r*s*l-r*o*c}invert(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],d=u*o-a*l,f=a*c-u*s,h=l*s-o*c,g=t*d+i*f+r*h;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/g;return e[0]=d*x,e[1]=(r*l-u*i)*x,e[2]=(a*i-r*o)*x,e[3]=f*x,e[4]=(u*t-r*c)*x,e[5]=(r*s-a*t)*x,e[6]=h*x,e[7]=(i*c-l*t)*x,e[8]=(o*t-i*s)*x,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,o,a){let c=Math.cos(s),l=Math.sin(s);return this.set(i*c,i*l,-i*(c*o+l*a)+o+e,-r*l,r*c,-r*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return ml("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(oy.makeScale(e,t)),this}rotate(e){return ml("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(oy.makeRotation(-e)),this}translate(e,t){return ml("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(oy.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},oy=new Ue,rb=new Ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),sb=new Ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function SP(){let n={enabled:!0,workingColorSpace:yl,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===gt&&(r.r=Pr(r.r),r.g=Pr(r.g),r.b=Pr(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===gt&&(r.r=Aa(r.r),r.g=Aa(r.g),r.b=Aa(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Vr?_l:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[o].fromXYZ).multiply(this.spaces[s].toXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[yl]:{primaries:e,whitePoint:i,transfer:_l,toXYZ:rb,fromXYZ:sb,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Wn},outputColorSpaceConfig:{drawingBufferColorSpace:Wn}},[Wn]:{primaries:e,whitePoint:i,transfer:gt,toXYZ:rb,fromXYZ:sb,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Wn}}}),n}var ot=SP();function Pr(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function Aa(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var ga,rh=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{ga===void 0&&(ga=xl("canvas")),ga.width=e.width,ga.height=e.height;let r=ga.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=ga}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=xl("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=Pr(s[o]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Pr(t[i]/255)*255):t[i]=Pr(t[i]);return{data:t,width:e.width,height:e.height}}else return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},EP=0,La=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:EP++}),this.uuid=$a(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width||0,t.height||0,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(ay(r[o].image)):s.push(ay(r[o]))}else s=ay(r);i.url=s}return t||(e.images[this.uuid]=i),i}};function ay(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?rh.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}var MP=0,cy=new L,Fn=class n extends Ki{constructor(e=n.DEFAULT_IMAGE,t=n.DEFAULT_MAPPING,i=Yi,r=Yi,s=In,o=Ur,a=Ti,c=kn,l=n.DEFAULT_ANISOTROPY,u=Vr){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:MP++}),this.uuid=$a(),this.name="",this.source=new La(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new et(0,0),this.repeat=new et(1,1),this.center=new et(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(cy).x}get height(){return this.source.getSize(cy).y}get depth(){return this.source.getSize(cy).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let i=e[t];if(i===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){Ae(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Yy)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case th:e.x=e.x-Math.floor(e.x);break;case Yi:e.x=e.x<0?0:1;break;case nh:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case th:e.y=e.y-Math.floor(e.y);break;case Yi:e.y=e.y<0?0:1;break;case nh:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Fn.DEFAULT_IMAGE=null;Fn.DEFAULT_MAPPING=Yy;Fn.DEFAULT_ANISOTROPY=1;var At=class{static{this.prototype.isVector4=!0}constructor(e=0,t=0,i=0,r=1){this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,i=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*i+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*i+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*i+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s,c=e.elements,l=c[0],u=c[4],d=c[8],f=c[1],h=c[5],g=c[9],x=c[2],p=c[6],m=c[10];if(Math.abs(u-f)<.01&&Math.abs(d-x)<.01&&Math.abs(g-p)<.01){if(Math.abs(u+f)<.1&&Math.abs(d+x)<.1&&Math.abs(g+p)<.1&&Math.abs(l+h+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let C=(l+1)/2,b=(h+1)/2,T=(m+1)/2,w=(u+f)/4,v=(d+x)/4,E=(g+p)/4;return C>b&&C>T?C<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(C),r=w/i,s=v/i):b>T?b<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(b),i=w/r,s=E/r):T<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(T),i=v/s,r=E/s),this.set(i,r,s,t),this}let S=Math.sqrt((p-g)*(p-g)+(d-x)*(d-x)+(f-u)*(f-u));return Math.abs(S)<.001&&(S=1),this.x=(p-g)/S,this.y=(d-x)/S,this.z=(f-u)/S,this.w=Math.acos((l+h+m-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=at(this.x,e.x,t.x),this.y=at(this.y,e.y,t.y),this.z=at(this.z,e.z,t.z),this.w=at(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=at(this.x,e,t),this.y=at(this.y,e,t),this.z=at(this.z,e,t),this.w=at(this.w,e,t),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(at(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},sh=class extends Ki{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:In,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new At(0,0,e,t),this.scissorTest=!1,this.viewport=new At(0,0,e,t),this.textures=[];let r=i.count;for(let s=0;s<r;s++)this.textures[s]=new Fn({width:e,height:t,depth:i.depth}),this.textures[s].isRenderTargetTexture=!0,this.textures[s].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveColorBuffer=i.resolveColorBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this.storeMultisampledColorBuffer=i.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=i.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=i.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:In,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let r=Object.assign({},e.textures[t].image);this.textures[t].source=new La(r)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},$n=class extends sh{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},Sl=class extends Fn{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=on,this.minFilter=on,this.wrapR=Yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var oh=class extends Fn{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=on,this.minFilter=on,this.wrapR=Yi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}};var wt=class n{static{this.prototype.isMatrix4=!0}constructor(e,t,i,r,s,o,a,c,l,u,d,f,h,g,x,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,o,a,c,l,u,d,f,h,g,x,p)}set(e,t,i,r,s,o,a,c,l,u,d,f,h,g,x,p){let m=this.elements;return m[0]=e,m[4]=t,m[8]=i,m[12]=r,m[1]=s,m[5]=o,m[9]=a,m[13]=c,m[2]=l,m[6]=u,m[10]=d,m[14]=f,m[3]=h,m[7]=g,m[11]=x,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){let t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,i=e.elements,r=1/va.setFromMatrixColumn(e,0).length(),s=1/va.setFromMatrixColumn(e,1).length(),o=1/va.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,i=e.x,r=e.y,s=e.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){let f=o*u,h=o*d,g=a*u,x=a*d;t[0]=c*u,t[4]=-c*d,t[8]=l,t[1]=h+g*l,t[5]=f-x*l,t[9]=-a*c,t[2]=x-f*l,t[6]=g+h*l,t[10]=o*c}else if(e.order==="YXZ"){let f=c*u,h=c*d,g=l*u,x=l*d;t[0]=f+x*a,t[4]=g*a-h,t[8]=o*l,t[1]=o*d,t[5]=o*u,t[9]=-a,t[2]=h*a-g,t[6]=x+f*a,t[10]=o*c}else if(e.order==="ZXY"){let f=c*u,h=c*d,g=l*u,x=l*d;t[0]=f-x*a,t[4]=-o*d,t[8]=g+h*a,t[1]=h+g*a,t[5]=o*u,t[9]=x-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){let f=o*u,h=o*d,g=a*u,x=a*d;t[0]=c*u,t[4]=g*l-h,t[8]=f*l+x,t[1]=c*d,t[5]=x*l+f,t[9]=h*l-g,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){let f=o*c,h=o*l,g=a*c,x=a*l;t[0]=c*u,t[4]=x-f*d,t[8]=g*d+h,t[1]=d,t[5]=o*u,t[9]=-a*u,t[2]=-l*u,t[6]=h*d+g,t[10]=f-x*d}else if(e.order==="XZY"){let f=o*c,h=o*l,g=a*c,x=a*l;t[0]=c*u,t[4]=-d,t[8]=l*u,t[1]=f*d+x,t[5]=o*u,t[9]=h*d-g,t[2]=g*d-h,t[6]=a*u,t[10]=x*d+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(bP,e,wP)}lookAt(e,t,i){let r=this.elements;return Gn.subVectors(e,t),Gn.lengthSq()===0&&(Gn.z=1),Gn.normalize(),cs.crossVectors(i,Gn),cs.lengthSq()===0&&(Math.abs(i.z)===1?Gn.x+=1e-4:Gn.z+=1e-4,Gn.normalize(),cs.crossVectors(i,Gn)),cs.normalize(),Sf.crossVectors(Gn,cs),r[0]=cs.x,r[4]=Sf.x,r[8]=Gn.x,r[1]=cs.y,r[5]=Sf.y,r[9]=Gn.y,r[2]=cs.z,r[6]=Sf.z,r[10]=Gn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,r=t.elements,s=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],u=i[1],d=i[5],f=i[9],h=i[13],g=i[2],x=i[6],p=i[10],m=i[14],S=i[3],C=i[7],b=i[11],T=i[15],w=r[0],v=r[4],E=r[8],O=r[12],R=r[1],P=r[5],U=r[9],G=r[13],I=r[2],z=r[6],$=r[10],H=r[14],te=r[3],W=r[7],J=r[11],Q=r[15];return s[0]=o*w+a*R+c*I+l*te,s[4]=o*v+a*P+c*z+l*W,s[8]=o*E+a*U+c*$+l*J,s[12]=o*O+a*G+c*H+l*Q,s[1]=u*w+d*R+f*I+h*te,s[5]=u*v+d*P+f*z+h*W,s[9]=u*E+d*U+f*$+h*J,s[13]=u*O+d*G+f*H+h*Q,s[2]=g*w+x*R+p*I+m*te,s[6]=g*v+x*P+p*z+m*W,s[10]=g*E+x*U+p*$+m*J,s[14]=g*O+x*G+p*H+m*Q,s[3]=S*w+C*R+b*I+T*te,s[7]=S*v+C*P+b*z+T*W,s[11]=S*E+C*U+b*$+T*J,s[15]=S*O+C*G+b*H+T*Q,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],o=e[1],a=e[5],c=e[9],l=e[13],u=e[2],d=e[6],f=e[10],h=e[14],g=e[3],x=e[7],p=e[11],m=e[15],S=c*h-l*f,C=a*h-l*d,b=a*f-c*d,T=o*h-l*u,w=o*f-c*u,v=o*d-a*u;return t*(x*S-p*C+m*b)-i*(g*S-p*T+m*w)+r*(g*C-x*T+m*v)-s*(g*b-x*w+p*v)}determinantAffine(){let e=this.elements,t=e[0],i=e[4],r=e[8],s=e[1],o=e[5],a=e[9],c=e[2],l=e[6],u=e[10];return t*(o*u-a*l)-i*(s*u-a*c)+r*(s*l-o*c)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){let e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],d=e[9],f=e[10],h=e[11],g=e[12],x=e[13],p=e[14],m=e[15],S=t*a-i*o,C=t*c-r*o,b=t*l-s*o,T=i*c-r*a,w=i*l-s*a,v=r*l-s*c,E=u*x-d*g,O=u*p-f*g,R=u*m-h*g,P=d*p-f*x,U=d*m-h*x,G=f*m-h*p,I=S*G-C*U+b*P+T*R-w*O+v*E;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let z=1/I;return e[0]=(a*G-c*U+l*P)*z,e[1]=(r*U-i*G-s*P)*z,e[2]=(x*v-p*w+m*T)*z,e[3]=(f*w-d*v-h*T)*z,e[4]=(c*R-o*G-l*O)*z,e[5]=(t*G-r*R+s*O)*z,e[6]=(p*b-g*v-m*C)*z,e[7]=(u*v-f*b+h*C)*z,e[8]=(o*U-a*R+l*E)*z,e[9]=(i*R-t*U-s*E)*z,e[10]=(g*w-x*b+m*S)*z,e[11]=(d*b-u*w-h*S)*z,e[12]=(a*O-o*P-c*E)*z,e[13]=(t*P-i*O+r*E)*z,e[14]=(x*C-g*T-p*S)*z,e[15]=(u*T-d*C+f*S)*z,this}scale(e){let t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let i=Math.cos(t),r=Math.sin(t),s=1-i,o=e.x,a=e.y,c=e.z,l=s*o,u=s*a;return this.set(l*o+i,l*a-r*c,l*c+r*a,0,l*a+r*c,u*a+i,u*c-r*o,0,l*c-r*a,u*c+r*o,s*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,o){return this.set(1,i,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){let r=this.elements,s=t._x,o=t._y,a=t._z,c=t._w,l=s+s,u=o+o,d=a+a,f=s*l,h=s*u,g=s*d,x=o*u,p=o*d,m=a*d,S=c*l,C=c*u,b=c*d,T=i.x,w=i.y,v=i.z;return r[0]=(1-(x+m))*T,r[1]=(h+b)*T,r[2]=(g-C)*T,r[3]=0,r[4]=(h-b)*w,r[5]=(1-(f+m))*w,r[6]=(p+S)*w,r[7]=0,r[8]=(g+C)*v,r[9]=(p-S)*v,r[10]=(1-(f+x))*v,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let s=this.determinantAffine();if(s===0)return i.set(1,1,1),t.identity(),this;let o=va.set(r[0],r[1],r[2]).length(),a=va.set(r[4],r[5],r[6]).length(),c=va.set(r[8],r[9],r[10]).length();s<0&&(o=-o),xi.copy(this);let l=1/o,u=1/a,d=1/c;return xi.elements[0]*=l,xi.elements[1]*=l,xi.elements[2]*=l,xi.elements[4]*=u,xi.elements[5]*=u,xi.elements[6]*=u,xi.elements[8]*=d,xi.elements[9]*=d,xi.elements[10]*=d,t.setFromRotationMatrix(xi),i.x=o,i.y=a,i.z=c,this}makePerspective(e,t,i,r,s,o,a=ci,c=!1){let l=this.elements,u=2*s/(t-e),d=2*s/(i-r),f=(t+e)/(t-e),h=(i+r)/(i-r),g,x;if(c)g=s/(o-s),x=o*s/(o-s);else if(a===ci)g=-(o+s)/(o-s),x=-2*o*s/(o-s);else if(a===Na)g=-o/(o-s),x=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=d,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=x,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,i,r,s,o,a=ci,c=!1){let l=this.elements,u=2/(t-e),d=2/(i-r),f=-(t+e)/(t-e),h=-(i+r)/(i-r),g,x;if(c)g=1/(o-s),x=o/(o-s);else if(a===ci)g=-2/(o-s),x=-(o+s)/(o-s);else if(a===Na)g=-1/(o-s),x=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=d,l[9]=0,l[13]=h,l[2]=0,l[6]=0,l[10]=g,l[14]=x,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}},va=new L,xi=new wt,bP=new L(0,0,0),wP=new L(1,1,1),cs=new L,Sf=new L,Gn=new L,ob=new wt,ab=new Ji,Lr=class n{constructor(e=0,t=0,i=0,r=n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){let r=e.elements,s=r[0],o=r[4],a=r[8],c=r[1],l=r[5],u=r[9],d=r[2],f=r[6],h=r[10];switch(t){case"XYZ":this._y=Math.asin(at(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,h),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-at(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,h),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(at(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-d,h),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-at(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(f,h),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(at(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(a,h));break;case"XZY":this._z=Math.asin(-at(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,h),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return ob.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ob,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ab.setFromEuler(this),this.setFromQuaternion(ab,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Lr.DEFAULT_ORDER="XYZ";var Fa=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},CP=0,cb=new L,ya=new Ji,Cr=new wt,Ef=new L,ul=new L,TP=new L,DP=new Ji,lb=new L(1,0,0),ub=new L(0,1,0),db=new L(0,0,1),fb={type:"added"},IP={type:"removed"},_a={type:"childadded",child:null},ly={type:"childremoved",child:null},yn=class n extends Ki{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:CP++}),this.uuid=$a(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let e=new L,t=new Lr,i=new Ji,r=new L(1,1,1);function s(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new wt},normalMatrix:{value:new Ue}}),this.matrix=new wt,this.matrixWorld=new wt,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Fa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ya.setFromAxisAngle(e,t),this.quaternion.multiply(ya),this}rotateOnWorldAxis(e,t){return ya.setFromAxisAngle(e,t),this.quaternion.premultiply(ya),this}rotateX(e){return this.rotateOnAxis(lb,e)}rotateY(e){return this.rotateOnAxis(ub,e)}rotateZ(e){return this.rotateOnAxis(db,e)}translateOnAxis(e,t){return cb.copy(e).applyQuaternion(this.quaternion),this.position.add(cb.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(lb,e)}translateY(e){return this.translateOnAxis(ub,e)}translateZ(e){return this.translateOnAxis(db,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Cr.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Ef.copy(e):Ef.set(e,t,i);let r=this.parent;this.updateWorldMatrix(!0,!1),ul.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Cr.lookAt(ul,Ef,this.up):Cr.lookAt(Ef,ul,this.up),this.quaternion.setFromRotationMatrix(Cr),r&&(Cr.extractRotation(r.matrixWorld),ya.setFromRotationMatrix(Cr),this.quaternion.premultiply(ya.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Fe("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(fb),_a.child=e,this.dispatchEvent(_a),_a.child=null):Fe("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(IP),ly.child=e,this.dispatchEvent(ly),ly.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Cr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Cr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Cr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(fb),_a.child=e,this.dispatchEvent(_a),_a.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){let o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ul,e,TP),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ul,DP,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);let t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,i=e.y,r=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*i-s[8]*r,s[13]+=i-s[1]*t-s[5]*i-s[9]*r,s[14]+=r-s[2]*t-s[6]*i-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){let s=this.children;for(let o=0,a=s.length;o<a;o++)s[o].updateWorldMatrix(!1,!0,i)}}toJSON(e){let t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>_t(he({},a),{boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>he({},a)),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){let d=c[l];s(e.shapes,d)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(s(e.materials,this.material[c]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];r.animations.push(s(e.animations,c))}}if(t){let a=o(e.geometries),c=o(e.materials),l=o(e.textures),u=o(e.images),d=o(e.shapes),f=o(e.skeletons),h=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),u.length>0&&(i.images=u),d.length>0&&(i.shapes=d),f.length>0&&(i.skeletons=f),h.length>0&&(i.animations=h),g.length>0&&(i.nodes=g)}return i.object=r,i;function o(a){let c=[];for(let l in a){let u=a[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){let r=e.children[i];this.add(r.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};yn.DEFAULT_UP=new L(0,1,0);yn.DEFAULT_MATRIX_AUTO_UPDATE=!0;yn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Nr=class extends yn{constructor(){super(),this.isGroup=!0,this.type="Group"}},AP={type:"move"},ka=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Nr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Nr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Nr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(let x of e.hand.values()){let p=t.getJointPose(x,i),m=this._getHandJoint(l,x);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let u=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],f=u.position.distanceTo(d.position),h=.02,g=.005;l.inputState.pinching&&f>h+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=h-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.quaternion,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.quaternion,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(AP)))}return a!==null&&(a.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new Nr;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},mw={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ls={h:0,s:0,l:0},Mf={h:0,s:0,l:0};function uy(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}var je=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Wn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ot.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=ot.workingColorSpace){return this.r=e,this.g=t,this.b=i,ot.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=ot.workingColorSpace){if(e=c_(e,1),t=at(t,0,1),i=at(i,0,1),t===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+t):i+t-i*t,o=2*i-s;this.r=uy(o,s,e+1/3),this.g=uy(o,s,e),this.b=uy(o,s,e-1/3)}return ot.colorSpaceToWorking(this,r),this}setStyle(e,t=Wn){function i(s){s!==void 0&&parseFloat(s)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return i(s[4]),this.setRGB(Math.min(100,parseFloat(s[1]))/100,Math.min(100,parseFloat(s[2]))/100,Math.min(100,parseFloat(s[3]))/100,t);break;case"hsl":case"hsla":if(s=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Wn){let i=mw[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Pr(e.r),this.g=Pr(e.g),this.b=Pr(e.b),this}copyLinearToSRGB(e){return this.r=Aa(e.r),this.g=Aa(e.g),this.b=Aa(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Wn){return ot.workingToColorSpace(En.copy(this),e),Math.round(at(En.r*255,0,255))*65536+Math.round(at(En.g*255,0,255))*256+Math.round(at(En.b*255,0,255))}getHexString(e=Wn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ot.workingColorSpace){ot.workingToColorSpace(En.copy(this),t);let i=En.r,r=En.g,s=En.b,o=Math.max(i,r,s),a=Math.min(i,r,s),c,l,u=(a+o)/2;if(a===o)c=0,l=0;else{let d=o-a;switch(l=u<=.5?d/(o+a):d/(2-o-a),o){case i:c=(r-s)/d+(r<s?6:0);break;case r:c=(s-i)/d+2;break;case s:c=(i-r)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=ot.workingColorSpace){return ot.workingToColorSpace(En.copy(this),t),e.r=En.r,e.g=En.g,e.b=En.b,e}getStyle(e=Wn){ot.workingToColorSpace(En.copy(this),e);let t=En.r,i=En.g,r=En.b;return e!==Wn?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(ls),this.setHSL(ls.h+e,ls.s+t,ls.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(ls),e.getHSL(Mf);let i=gl(ls.h,Mf.h,t),r=gl(ls.s,Mf.s,t),s=gl(ls.l,Mf.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},En=new je;je.NAMES=mw;var El=class n{constructor(e,t=1,i=1e3){this.isFog=!0,this.name="",this.color=new je(e),this.near=t,this.far=i}clone(){return new n(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Ml=class extends yn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Lr,this.environmentIntensity=1,this.environmentRotation=new Lr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background!==null?e.background.clone():null,this.environment=e.environment!==null?e.environment.clone():null,this.fog=e.fog!==null?e.fog.clone():null,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial!==null?e.overrideMaterial.clone():null,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Si=new L,Tr=new L,dy=new L,Dr=new L,xa=new L,Sa=new L,hb=new L,fy=new L,hy=new L,py=new L,my=new At,gy=new At,vy=new At,Rr=class n{constructor(e=new L,t=new L,i=new L){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),Si.subVectors(e,t),r.cross(Si);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){Si.subVectors(r,t),Tr.subVectors(i,t),dy.subVectors(e,t);let o=Si.dot(Si),a=Si.dot(Tr),c=Si.dot(dy),l=Tr.dot(Tr),u=Tr.dot(dy),d=o*l-a*a;if(d===0)return s.set(0,0,0),null;let f=1/d,h=(l*c-a*u)*f,g=(o*u-a*c)*f;return s.set(1-h-g,g,h)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,Dr)===null?!1:Dr.x>=0&&Dr.y>=0&&Dr.x+Dr.y<=1}static getInterpolation(e,t,i,r,s,o,a,c){return this.getBarycoord(e,t,i,r,Dr)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Dr.x),c.addScaledVector(o,Dr.y),c.addScaledVector(a,Dr.z),c)}static getInterpolatedAttribute(e,t,i,r,s,o){return my.setScalar(0),gy.setScalar(0),vy.setScalar(0),my.fromBufferAttribute(e,t),gy.fromBufferAttribute(e,i),vy.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(my,s.x),o.addScaledVector(gy,s.y),o.addScaledVector(vy,s.z),o}static isFrontFacing(e,t,i,r){return Si.subVectors(i,t),Tr.subVectors(e,t),Si.cross(Tr).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Si.subVectors(this.c,this.b),Tr.subVectors(this.a,this.b),Si.cross(Tr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return n.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let i=this.a,r=this.b,s=this.c,o,a;xa.subVectors(r,i),Sa.subVectors(s,i),fy.subVectors(e,i);let c=xa.dot(fy),l=Sa.dot(fy);if(c<=0&&l<=0)return t.copy(i);hy.subVectors(e,r);let u=xa.dot(hy),d=Sa.dot(hy);if(u>=0&&d<=u)return t.copy(r);let f=c*d-u*l;if(f<=0&&c>=0&&u<=0&&c-u>0)return o=c/(c-u),t.copy(i).addScaledVector(xa,o);py.subVectors(e,s);let h=xa.dot(py),g=Sa.dot(py);if(g>=0&&h<=g)return t.copy(s);let x=h*l-c*g;if(x<=0&&l>=0&&g<=0)return a=l/(l-g),t.copy(i).addScaledVector(Sa,a);let p=u*g-h*d;if(p<=0&&d-u>=0&&h-g>=0)return hb.subVectors(s,r),a=(d-u)/(d-u+(h-g)),t.copy(r).addScaledVector(hb,a);let m=1/(p+x+f);return o=x*m,a=f*m,t.copy(i).addScaledVector(xa,o).addScaledVector(Sa,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},hs=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Ei.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Ei.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=Ei.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Ei):Ei.fromBufferAttribute(s,o),Ei.applyMatrix4(e.matrixWorld),this.expandByPoint(Ei);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),bf.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),bf.copy(i.boundingBox)),bf.applyMatrix4(e.matrixWorld),this.union(bf)}let r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ei),Ei.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(dl),wf.subVectors(this.max,dl),Ea.subVectors(e.a,dl),Ma.subVectors(e.b,dl),ba.subVectors(e.c,dl),us.subVectors(Ma,Ea),ds.subVectors(ba,Ma),fo.subVectors(Ea,ba);let t=[0,-us.z,us.y,0,-ds.z,ds.y,0,-fo.z,fo.y,us.z,0,-us.x,ds.z,0,-ds.x,fo.z,0,-fo.x,-us.y,us.x,0,-ds.y,ds.x,0,-fo.y,fo.x,0];return!yy(t,Ea,Ma,ba,wf)||(t=[1,0,0,0,1,0,0,0,1],!yy(t,Ea,Ma,ba,wf))?!1:(Cf.crossVectors(us,ds),t=[Cf.x,Cf.y,Cf.z],yy(t,Ea,Ma,ba,wf))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ei).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ei).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ir[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ir[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ir[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ir[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ir[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ir[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ir[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ir[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ir),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Ir=[new L,new L,new L,new L,new L,new L,new L,new L],Ei=new L,bf=new hs,Ea=new L,Ma=new L,ba=new L,us=new L,ds=new L,fo=new L,dl=new L,wf=new L,Cf=new L,ho=new L;function yy(n,e,t,i,r){for(let s=0,o=n.length-3;s<=o;s+=3){ho.fromArray(n,s);let a=r.x*Math.abs(ho.x)+r.y*Math.abs(ho.y)+r.z*Math.abs(ho.z),c=e.dot(ho),l=t.dot(ho),u=i.dot(ho);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}var jt=new L,Tf=new et,RP=0,Zi=class extends Ki{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:RP++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=cw,this.updateRanges=[],this.gpuType=wi,this.version=0,this._normalizationScale=e!==void 0?u_(e):void 0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Tf.fromBufferAttribute(this,t),Tf.applyMatrix3(e),this.setXY(t,Tf.x,Tf.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)jt.fromBufferAttribute(this,t),jt.applyMatrix3(e),this.setXYZ(t,jt.x,jt.y,jt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)jt.fromBufferAttribute(this,t),jt.applyMatrix4(e),this.setXYZ(t,jt.x,jt.y,jt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)jt.fromBufferAttribute(this,t),jt.applyNormalMatrix(e),this.setXYZ(t,jt.x,jt.y,jt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)jt.fromBufferAttribute(this,t),jt.transformDirection(e),this.setXYZ(t,jt.x,jt.y,jt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=this._denormalize(i)),i}setComponent(e,t,i){return this.normalized&&(i=this._normalize(i)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),i=this._normalize(i),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),i=this._normalize(i),r=this._normalize(r),s=this._normalize(s)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(e){let t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):hw(e,this.array)}_normalize(e){let t=this._normalizationScale;return t!==void 0?Math.round(e*t):pw(e,this.array)}};var bl=class extends Zi{constructor(e,t,i){super(new Uint16Array(e),t,i)}};var wl=class extends Zi{constructor(e,t,i){super(new Uint32Array(e),t,i)}};var It=class extends Zi{constructor(e,t,i){super(new Float32Array(e),t,i)}},NP=new hs,fl=new L,_y=new L,go=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):NP.setFromPoints(e).getCenter(i);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fl.subVectors(e,this.center);let t=fl.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(fl,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(_y.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(fl.copy(e.center).add(_y)),this.expandByPoint(fl.copy(e.center).sub(_y))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},PP=0,ai=new wt,xy=new yn,wa=new L,jn=new hs,hl=new hs,sn=new L,qn=class n extends Ki{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:PP++}),this.uuid=$a(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(rP(e)?wl:bl)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new Ue().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return ai.makeRotationFromQuaternion(e),this.applyMatrix4(ai),this}rotateX(e){return ai.makeRotationX(e),this.applyMatrix4(ai),this}rotateY(e){return ai.makeRotationY(e),this.applyMatrix4(ai),this}rotateZ(e){return ai.makeRotationZ(e),this.applyMatrix4(ai),this}translate(e,t,i){return ai.makeTranslation(e,t,i),this.applyMatrix4(ai),this}scale(e,t,i){return ai.makeScale(e,t,i),this.applyMatrix4(ai),this}lookAt(e){return xy.lookAt(e),xy.updateMatrix(),this.applyMatrix4(xy.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(wa).negate(),this.translate(wa.x,wa.y,wa.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let i=[];for(let r=0,s=e.length;r<s;r++){let o=e[r];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new It(i,3))}else{let i=Math.min(e.length,t.count);for(let r=0;r<i;r++){let s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hs);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Fe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){let s=t[i];jn.setFromBufferAttribute(s),this.morphTargetsRelative?(sn.addVectors(this.boundingBox.min,jn.min),this.boundingBox.expandByPoint(sn),sn.addVectors(this.boundingBox.max,jn.max),this.boundingBox.expandByPoint(sn)):(this.boundingBox.expandByPoint(jn.min),this.boundingBox.expandByPoint(jn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Fe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new go);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Fe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(e){let i=this.boundingSphere.center;if(jn.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){let a=t[s];hl.setFromBufferAttribute(a),this.morphTargetsRelative?(sn.addVectors(jn.min,hl.min),jn.expandByPoint(sn),sn.addVectors(jn.max,hl.max),jn.expandByPoint(sn)):(jn.expandByPoint(hl.min),jn.expandByPoint(hl.max))}jn.getCenter(i);let r=0;for(let s=0,o=e.count;s<o;s++)sn.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(sn));if(t)for(let s=0,o=t.length;s<o;s++){let a=t[s],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)sn.fromBufferAttribute(a,l),c&&(wa.fromBufferAttribute(e,l),sn.add(wa)),r=Math.max(r,i.distanceToSquared(sn))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Fe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Fe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=t.position,r=t.normal,s=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==i.count)&&(o=new Zi(new Float32Array(4*i.count),4),this.setAttribute("tangent",o));let a=[],c=[],l=new Uint8Array(i.count);for(let O=0;O<i.count;O++)a[O]=new L,c[O]=new L;let u=new L,d=new L,f=new L,h=new et,g=new et,x=new et,p=new L,m=new L;function S(O,R,P){l[O]=l[R]=l[P]=1,u.fromBufferAttribute(i,O),d.fromBufferAttribute(i,R),f.fromBufferAttribute(i,P),h.fromBufferAttribute(s,O),g.fromBufferAttribute(s,R),x.fromBufferAttribute(s,P),d.sub(u),f.sub(u),g.sub(h),x.sub(h);let U=1/(g.x*x.y-x.x*g.y);isFinite(U)&&(p.copy(d).multiplyScalar(x.y).addScaledVector(f,-g.y).multiplyScalar(U),m.copy(f).multiplyScalar(g.x).addScaledVector(d,-x.x).multiplyScalar(U),a[O].add(p),a[R].add(p),a[P].add(p),c[O].add(m),c[R].add(m),c[P].add(m))}let C=this.groups;C.length===0&&(C=[{start:0,count:e.count}]);for(let O=0,R=C.length;O<R;++O){let P=C[O],U=P.start,G=P.count;for(let I=U,z=U+G;I<z;I+=3)S(e.getX(I+0),e.getX(I+1),e.getX(I+2))}let b=new L,T=new L,w=new L,v=new L;function E(O){w.fromBufferAttribute(r,O),v.copy(w);let R=a[O];b.copy(R),b.sub(w.multiplyScalar(w.dot(R))).normalize(),T.crossVectors(v,R);let U=T.dot(c[O])<0?-1:1;o.setXYZW(O,b.x,b.y,b.z,U)}for(let O=0,R=i.count;O<R;++O)l[O]&&E(O);this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new Zi(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let f=0,h=i.count;f<h;f++)i.setXYZ(f,0,0,0);let r=new L,s=new L,o=new L,a=new L,c=new L,l=new L,u=new L,d=new L;if(e)for(let f=0,h=e.count;f<h;f+=3){let g=e.getX(f+0),x=e.getX(f+1),p=e.getX(f+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,x),o.fromBufferAttribute(t,p),u.subVectors(o,s),d.subVectors(r,s),u.cross(d),a.fromBufferAttribute(i,g),c.fromBufferAttribute(i,x),l.fromBufferAttribute(i,p),a.add(u),c.add(u),l.add(u),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(x,c.x,c.y,c.z),i.setXYZ(p,l.x,l.y,l.z)}else for(let f=0,h=t.count;f<h;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),u.subVectors(o,s),d.subVectors(r,s),u.cross(d),i.setXYZ(f+0,u.x,u.y,u.z),i.setXYZ(f+1,u.x,u.y,u.z),i.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)sn.fromBufferAttribute(e,t),sn.normalize(),e.setXYZ(t,sn.x,sn.y,sn.z)}toNonIndexed(){function e(a,c){let l=a.array,u=a.itemSize,d=a.normalized,f=new l.constructor(c.length*u),h=0,g=0;for(let x=0,p=c.length;x<p;x++){a.isInterleavedBufferAttribute?h=c[x]*a.data.stride+a.offset:h=c[x]*u;for(let m=0;m<u;m++)f[g++]=l[h++]}return new Zi(f,u,d)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new n,i=this.index.array,r=this.attributes;for(let a in r){let c=r[a],l=e(c,i);t.setAttribute(a,l)}let s=this.morphAttributes;for(let a in s){let c=[],l=s[a];for(let u=0,d=l.length;u<d;u++){let f=l[u],h=e(f,i);c.push(h)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let i=this.attributes;for(let c in i){let l=i[c];e.data.attributes[c]=l.toJSON(e.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],u=[];for(let d=0,f=l.length;d<f;d++){let h=l[d];u.push(h.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone());let r=e.attributes;for(let l in r){let u=r[l];this.setAttribute(l,u.clone(t))}let s=e.morphAttributes;for(let l in s){let u=[],d=s[l];for(let f=0,h=d.length;f<h;f++)u.push(d[f].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let l=0,u=o.length;l<u;l++){let d=o[l];this.addGroup(d.start,d.count,d.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Sy=new L,OP=new L,LP=new Ue,Mi=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let r=Sy.subVectors(i,t).cross(OP.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){let r=e.delta(Sy),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/s;return i===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(r,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||LP.getNormalMatrix(e),r=this.coplanarPoint(Sy).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},FP=0,Fr=class extends Ki{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:FP++}),this.uuid=$a(),this.name="",this.type="Material",this.blending=Ga,this.side=Ss,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=By,this.blendDst=Vy,this.blendEquation=_o,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=Ra,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=nw,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qf,this.stencilZFail=qf,this.stencilZPass=qf,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){Ae(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector2&&i&&i.isVector2||r&&r.isEuler&&i&&i.isEuler||r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,i.blending=this.blending,i.side=this.side,i.shadowSide=this.shadowSide,i.vertexColors=this.vertexColors,i.opacity=this.opacity,i.transparent=this.transparent,i.blendSrc=this.blendSrc,i.blendDst=this.blendDst,i.blendEquation=this.blendEquation,i.blendSrcAlpha=this.blendSrcAlpha,i.blendDstAlpha=this.blendDstAlpha,i.blendEquationAlpha=this.blendEquationAlpha,i.blendColor=this.blendColor.getHex(),i.blendAlpha=this.blendAlpha,i.depthFunc=this.depthFunc,i.depthTest=this.depthTest,i.depthWrite=this.depthWrite,i.colorWrite=this.colorWrite,i.clipIntersection=this.clipIntersection,i.clipShadows=this.clipShadows,i.stencilWriteMask=this.stencilWriteMask,i.stencilFunc=this.stencilFunc,i.stencilRef=this.stencilRef,i.stencilFuncMask=this.stencilFuncMask,i.stencilFail=this.stencilFail,i.stencilZFail=this.stencilZFail,i.stencilZPass=this.stencilZPass,i.stencilWrite=this.stencilWrite,i.polygonOffset=this.polygonOffset,i.polygonOffsetFactor=this.polygonOffsetFactor,i.polygonOffsetUnits=this.polygonOffsetUnits,i.dithering=this.dithering,i.alphaTest=this.alphaTest,i.alphaHash=this.alphaHash,i.alphaToCoverage=this.alphaToCoverage,i.premultipliedAlpha=this.premultipliedAlpha,i.forceSinglePass=this.forceSinglePass,i.allowOverride=this.allowOverride,i.visible=this.visible,i.toneMapped=this.toneMapped,i.name=this.name,this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(i.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(i.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(i.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(i.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(i.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(i.clippingPlanes=this.clippingPlanes.map(s=>s.toJSON())),this.rotation!==void 0&&(i.rotation=this.rotation),this.depthPacking!==void 0&&(i.depthPacking=this.depthPacking),this.linewidth!==void 0&&(i.linewidth=this.linewidth),this.linecap!==void 0&&(i.linecap=this.linecap),this.linejoin!==void 0&&(i.linejoin=this.linejoin),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.wireframe!==void 0&&(i.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(i.flatShading=this.flatShading),this.fog!==void 0&&(i.fog=this.fog),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){let o=[];for(let a in s){let c=s[a];delete c.metadata,o.push(c)}return o}if(t){let s=r(e.textures),o=r(e.images);s.length>0&&(i.textures=s),o.length>0&&(i.images=o)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new je().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(i=>new Mi().fromJSON(i))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new et().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new et().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var Ar=new L,Ey=new L,Df=new L,If=new L,Ua=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ar)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ar.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ar.copy(this.origin).addScaledVector(this.direction,t),Ar.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Ey.copy(e).add(t).multiplyScalar(.5),Df.copy(t).sub(e).normalize(),If.copy(this.origin).sub(Ey);let s=e.distanceTo(t)*.5,o=-this.direction.dot(Df),a=If.dot(this.direction),c=-If.dot(Df),l=If.lengthSq(),u=Math.abs(1-o*o),d,f,h,g;if(u>0)if(d=o*c-a,f=o*a-c,g=s*u,d>=0)if(f>=-g)if(f<=g){let x=1/u;d*=x,f*=x,h=d*(d+o*f+2*a)+f*(o*d+f+2*c)+l}else f=s,d=Math.max(0,-(o*f+a)),h=-d*d+f*(f+2*c)+l;else f=-s,d=Math.max(0,-(o*f+a)),h=-d*d+f*(f+2*c)+l;else f<=-g?(d=Math.max(0,-(-o*s+a)),f=d>0?-s:Math.min(Math.max(-s,-c),s),h=-d*d+f*(f+2*c)+l):f<=g?(d=0,f=Math.min(Math.max(-s,-c),s),h=f*(f+2*c)+l):(d=Math.max(0,-(o*s+a)),f=d>0?s:Math.min(Math.max(-s,-c),s),h=-d*d+f*(f+2*c)+l);else f=o>0?-s:s,d=Math.max(0,-(o*f+a)),h=-d*d+f*(f+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(Ey).addScaledVector(Df,f),h}intersectSphere(e,t){if(e.radius<0)return null;Ar.subVectors(e.center,this.origin);let i=Ar.dot(this.direction),r=Ar.dot(Ar)-i*i,s=e.radius*e.radius;if(r>s)return null;let o=Math.sqrt(s-r),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,o,a,c,l=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,f=this.origin;return l>=0?(i=(e.min.x-f.x)*l,r=(e.max.x-f.x)*l):(i=(e.max.x-f.x)*l,r=(e.min.x-f.x)*l),u>=0?(s=(e.min.y-f.y)*u,o=(e.max.y-f.y)*u):(s=(e.max.y-f.y)*u,o=(e.min.y-f.y)*u),i>o||s>r||((s>i||isNaN(i))&&(i=s),(o<r||isNaN(r))&&(r=o),d>=0?(a=(e.min.z-f.z)*d,c=(e.max.z-f.z)*d):(a=(e.max.z-f.z)*d,c=(e.min.z-f.z)*d),i>c||a>r)||((a>i||i!==i)&&(i=a),(c<r||r!==r)&&(r=c),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Ar)!==null}intersectTriangle(e,t,i,r,s){let o=this.origin,a=this.direction,c=a.x,l=a.y,u=a.z,d=e.x-o.x,f=e.y-o.y,h=e.z-o.z,g=t.x-o.x,x=t.y-o.y,p=t.z-o.z,m=i.x-o.x,S=i.y-o.y,C=i.z-o.z,b=Math.abs(c),T=Math.abs(l),w=Math.abs(u),v,E,O,R,P,U,G,I,z,$,H,te;if(b>=T&&b>=w?(O=c,U=d,z=g,te=m,c>=0?(v=l,E=u,R=f,P=h,G=x,I=p,$=S,H=C):(v=u,E=l,R=h,P=f,G=p,I=x,$=C,H=S)):T>=w?(O=l,U=f,z=x,te=S,l>=0?(v=u,E=c,R=h,P=d,G=p,I=g,$=C,H=m):(v=c,E=u,R=d,P=h,G=g,I=p,$=m,H=C)):(O=u,U=h,z=p,te=C,u>=0?(v=c,E=l,R=d,P=f,G=g,I=x,$=m,H=S):(v=l,E=c,R=f,P=d,G=x,I=g,$=S,H=m)),O===0)return null;let W=v/O,J=E/O,Q=1/O,Me=R-W*U,He=P-J*U,Y=G-W*z,ge=I-J*z,xe=$-W*te,Re=H-J*te,ve=xe*ge-Re*Y,We=Me*Re-He*xe,kt=Y*He-ge*Me;if(r){if(ve<0||We<0||kt<0)return null}else if((ve<0||We<0||kt<0)&&(ve>0||We>0||kt>0))return null;let Oe=ve+We+kt;if(Oe===0)return null;let vt=Q*(ve*U+We*z+kt*te);return(Oe>0?vt<0:vt>0)?null:this.at(vt/Oe,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ps=class extends Fr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Lr,this.combine=Hy,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},pb=new wt,po=new Ua,Af=new go,mb=new L,Rf=new L,Nf=new L,Pf=new L,My=new L,Of=new L,gb=new L,Lf=new L,Wt=class extends yn{constructor(e=new qn,t=new ps){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){let i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(r,e);let a=this.morphTargetInfluences;if(s&&a){Of.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let u=a[c],d=s[c];u!==0&&(My.fromBufferAttribute(d,e),o?Of.addScaledVector(My,u):Of.addScaledVector(My.sub(t),u))}t.add(Of)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Af.copy(i.boundingSphere),Af.applyMatrix4(s),po.copy(e.ray).recast(e.near),!(Af.containsPoint(po.origin)===!1&&(po.intersectSphere(Af,mb)===null||po.origin.distanceToSquared(mb)>(e.far-e.near)**2))&&(pb.copy(s).invert(),po.copy(e.ray).applyMatrix4(pb),!(i.boundingBox!==null&&po.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,po)))}_computeIntersections(e,t,i){let r,s=this.geometry,o=this.material,a=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,f=s.groups,h=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=f.length;g<x;g++){let p=f[g],m=o[p.materialIndex],S=Math.max(p.start,h.start),C=Math.min(a.count,Math.min(p.start+p.count,h.start+h.count));for(let b=S,T=C;b<T;b+=3){let w=a.getX(b),v=a.getX(b+1),E=a.getX(b+2);r=Ff(this,m,e,i,l,u,d,w,v,E),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{let g=Math.max(0,h.start),x=Math.min(a.count,h.start+h.count);for(let p=g,m=x;p<m;p+=3){let S=a.getX(p),C=a.getX(p+1),b=a.getX(p+2);r=Ff(this,o,e,i,l,u,d,S,C,b),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,x=f.length;g<x;g++){let p=f[g],m=o[p.materialIndex],S=Math.max(p.start,h.start),C=Math.min(c.count,Math.min(p.start+p.count,h.start+h.count));for(let b=S,T=C;b<T;b+=3){let w=b,v=b+1,E=b+2;r=Ff(this,m,e,i,l,u,d,w,v,E),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{let g=Math.max(0,h.start),x=Math.min(c.count,h.start+h.count);for(let p=g,m=x;p<m;p+=3){let S=p,C=p+1,b=p+2;r=Ff(this,o,e,i,l,u,d,S,C,b),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}}};function kP(n,e,t,i,r,s,o,a){let c;if(e.side===An?c=i.intersectTriangle(o,s,r,!0,a):c=i.intersectTriangle(r,s,o,e.side===Ss,a),c===null)return null;Lf.copy(a),Lf.applyMatrix4(n.matrixWorld);let l=t.ray.origin.distanceTo(Lf);return l<t.near||l>t.far?null:{distance:l,point:Lf.clone(),object:n}}function Ff(n,e,t,i,r,s,o,a,c,l){n.getVertexPosition(a,Rf),n.getVertexPosition(c,Nf),n.getVertexPosition(l,Pf);let u=kP(n,e,t,i,Rf,Nf,Pf,gb);if(u){let d=new L;Rr.getBarycoord(gb,Rf,Nf,Pf,d),r&&(u.uv=Rr.getInterpolatedAttribute(r,a,c,l,d,new et)),s&&(u.uv1=Rr.getInterpolatedAttribute(s,a,c,l,d,new et)),o&&(u.normal=Rr.getInterpolatedAttribute(o,a,c,l,d,new L),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));let f={a,b:c,c:l,normal:new L,materialIndex:0};Rr.getNormal(Rf,Nf,Pf,f.normal),u.face=f,u.barycoord=d}return u}var ah=class extends Fn{constructor(e=null,t=1,i=1,r,s,o,a,c,l=on,u=on,d,f){super(null,o,a,c,l,u,r,s,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var mo=new go,UP=new et(.5,.5),kf=new L,ms=class{constructor(e=new Mi,t=new Mi,i=new Mi,r=new Mi,s=new Mi,o=new Mi){this.planes=[e,t,i,r,s,o]}set(e,t,i,r,s,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=ci,i=!1){let r=this.planes,s=e.elements,o=s[0],a=s[1],c=s[2],l=s[3],u=s[4],d=s[5],f=s[6],h=s[7],g=s[8],x=s[9],p=s[10],m=s[11],S=s[12],C=s[13],b=s[14],T=s[15];if(r[0].setComponents(l-o,h-u,m-g,T-S).normalize(),r[1].setComponents(l+o,h+u,m+g,T+S).normalize(),r[2].setComponents(l+a,h+d,m+x,T+C).normalize(),r[3].setComponents(l-a,h-d,m-x,T-C).normalize(),i)r[4].setComponents(c,f,p,b).normalize(),r[5].setComponents(l-c,h-f,m-p,T-b).normalize();else if(r[4].setComponents(l-c,h-f,m-p,T-b).normalize(),t===ci)r[5].setComponents(l+c,h+f,m+p,T+b).normalize();else if(t===Na)r[5].setComponents(c,f,p,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),mo.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),mo.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(mo)}intersectsSprite(e){mo.center.set(0,0,0);let t=UP.distanceTo(e.center);return mo.radius=.7071067811865476+t,mo.applyMatrix4(e.matrixWorld),this.intersectsSphere(mo)}intersectsSphere(e){let t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let r=t[i];if(kf.x=r.normal.x>0?e.max.x:e.min.x,kf.y=r.normal.y>0?e.max.y:e.min.y,kf.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(kf)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},vb=new wt,ch=class n{constructor(){this.coordinateSystem=ci,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,i=this._frustums;for(let r=0;r<t.length;r++){let s=t[r];vb.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),i[r]===void 0&&(i[r]=new ms),i[r].setFromProjectionMatrix(vb,s.coordinateSystem,s.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){let t=this._frustums;for(let i=0;i<this._count;i++)if(t[i].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let i=0;i<this._count;i++)if(t[i].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let i=0;i<this._count;i++)if(t[i].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let i=0;i<this._count;i++)if(t[i].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let i=0;i<this._count;i++)if(t[i].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,i=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new ms),t[r].copy(i[r]);return this._count=e._count,this}clone(){return new n().copy(this)}};var Ba=class extends Fr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new je(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},lh=new L,uh=new L,yb=new wt,pl=new Ua,Uf=new go,by=new L,_b=new L,dh=class extends yn{constructor(e=new qn,t=new Ba){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[0];for(let r=1,s=t.count;r<s;r++)lh.fromBufferAttribute(t,r-1),uh.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=lh.distanceTo(uh);e.setAttribute("lineDistance",new It(i,1))}else Ae("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Uf.copy(i.boundingSphere),Uf.applyMatrix4(r),Uf.radius+=s,e.ray.intersectsSphere(Uf)===!1)return;yb.copy(r).invert(),pl.copy(e.ray).applyMatrix4(yb);let a=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,u=i.index,f=i.attributes.position;if(u!==null){let h=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let x=h,p=g-1;x<p;x+=l){let m=u.getX(x),S=u.getX(x+1),C=Bf(this,e,pl,c,m,S,x);C&&t.push(C)}if(this.isLineLoop){let x=u.getX(g-1),p=u.getX(h),m=Bf(this,e,pl,c,x,p,g-1);m&&t.push(m)}}else{let h=Math.max(0,o.start),g=Math.min(f.count,o.start+o.count);for(let x=h,p=g-1;x<p;x+=l){let m=Bf(this,e,pl,c,x,x+1,x);m&&t.push(m)}if(this.isLineLoop){let x=Bf(this,e,pl,c,g-1,h,g-1);x&&t.push(x)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){let a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}};function Bf(n,e,t,i,r,s,o){let a=n.geometry.attributes.position;if(lh.fromBufferAttribute(a,r),uh.fromBufferAttribute(a,s),t.distanceSqToSegment(lh,uh,by,_b)>i)return;by.applyMatrix4(n.matrixWorld);let l=e.ray.origin.distanceTo(by);if(!(l<e.near||l>e.far))return{distance:l,point:_b.clone().applyMatrix4(n.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:n}}var xb=new L,Sb=new L,Cl=class extends dh{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[];for(let r=0,s=t.count;r<s;r+=2)xb.fromBufferAttribute(t,r),Sb.fromBufferAttribute(t,r+1),i[r]=r===0?0:i[r-1],i[r+1]=i[r]+xb.distanceTo(Sb);e.setAttribute("lineDistance",new It(i,1))}else Ae("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Tl=class extends Fn{constructor(e=[],t=xo,i,r,s,o,a,c,l,u){super(e,t,i,r,s,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};var kr=class extends Fn{constructor(e,t,i=bi,r,s,o,a=on,c=on,l,u=Or,d=1){if(u!==Or&&u!==Br)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let f={width:e,height:t,depth:d};super(f,r,s,o,a,c,u,i,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new La(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},Dl=class extends kr{constructor(e,t=bi,i=xo,r,s,o=on,a=on,c,l=Or){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,i,r,s,o,a,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Il=class extends Fn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},gs=class n extends qn{constructor(e=1,t=1,i=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:o};let a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);let c=[],l=[],u=[],d=[],f=0,h=0;g("z","y","x",-1,-1,i,t,e,o,s,0),g("z","y","x",1,-1,i,t,-e,o,s,1),g("x","z","y",1,1,e,i,t,r,o,2),g("x","z","y",1,-1,e,i,-t,r,o,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(c),this.setAttribute("position",new It(l,3)),this.setAttribute("normal",new It(u,3)),this.setAttribute("uv",new It(d,2));function g(x,p,m,S,C,b,T,w,v,E,O){let R=b/v,P=T/E,U=b/2,G=T/2,I=w/2,z=v+1,$=E+1,H=0,te=0,W=new L;for(let J=0;J<$;J++){let Q=J*P-G;for(let Me=0;Me<z;Me++){let He=Me*R-U;W[x]=He*S,W[p]=Q*C,W[m]=I,l.push(W.x,W.y,W.z),W[x]=0,W[p]=0,W[m]=w>0?1:-1,u.push(W.x,W.y,W.z),d.push(Me/v),d.push(1-J/E),H+=1}}for(let J=0;J<E;J++)for(let Q=0;Q<v;Q++){let Me=f+Q+z*J,He=f+Q+z*(J+1),Y=f+(Q+1)+z*(J+1),ge=f+(Q+1)+z*J;c.push(Me,He,ge),c.push(He,Y,ge),te+=6}a.addGroup(h,te,O),h+=te,f+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var Al=class n extends qn{constructor(e=1,t=32,i=0,r=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:i,thetaLength:r},t=Math.max(3,t);let s=[],o=[],a=[],c=[],l=new L,u=new et;o.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let d=0,f=3;d<=t;d++,f+=3){let h=i+d/t*r;l.x=e*Math.cos(h),l.y=e*Math.sin(h),o.push(l.x,l.y,l.z),a.push(0,0,1),u.x=(o[f]/e+1)/2,u.y=(o[f+1]/e+1)/2,c.push(u.x,u.y)}for(let d=1;d<=t;d++)s.push(d,d+1,0);this.setIndex(s),this.setAttribute("position",new It(o,3)),this.setAttribute("normal",new It(a,3)),this.setAttribute("uv",new It(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.segments,e.thetaStart,e.thetaLength)}},vs=class n extends qn{constructor(e=1,t=1,i=1,r=32,s=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let u=[],d=[],f=[],h=[],g=0,x=[],p=i/2,m=0;S(),o===!1&&(e>0&&C(!0),t>0&&C(!1)),this.setIndex(u),this.setAttribute("position",new It(d,3)),this.setAttribute("normal",new It(f,3)),this.setAttribute("uv",new It(h,2));function S(){let b=new L,T=new L,w=0,v=(t-e)/i;for(let E=0;E<=s;E++){let O=[],R=E/s,P=R*(t-e)+e;for(let U=0;U<=r;U++){let G=U/r,I=G*c+a,z=Math.sin(I),$=Math.cos(I);T.x=P*z,T.y=-R*i+p,T.z=P*$,d.push(T.x,T.y,T.z),b.set(z,v,$).normalize(),f.push(b.x,b.y,b.z),h.push(G,1-R),O.push(g++)}x.push(O)}for(let E=0;E<r;E++)for(let O=0;O<s;O++){let R=x[O][E],P=x[O+1][E],U=x[O+1][E+1],G=x[O][E+1];(e>0||O!==0)&&(u.push(R,P,G),w+=3),(t>0||O!==s-1)&&(u.push(P,U,G),w+=3)}l.addGroup(m,w,0),m+=w}function C(b){let T=g,w=new et,v=new L,E=0,O=b===!0?e:t,R=b===!0?1:-1;for(let U=1;U<=r;U++)d.push(0,p*R,0),f.push(0,R,0),h.push(.5,.5),g++;let P=g;for(let U=0;U<=r;U++){let I=U/r*c+a,z=Math.cos(I),$=Math.sin(I);v.x=O*$,v.y=p*R,v.z=O*z,d.push(v.x,v.y,v.z),f.push(0,R,0),w.x=z*.5+.5,w.y=$*.5*R+.5,h.push(w.x,w.y),g++}for(let U=0;U<r;U++){let G=T+U,I=P+U;b===!0?u.push(I,I+1,G):u.push(I+1,I,G),E+=3}l.addGroup(m,E,b===!0?1:2),m+=E}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Vf=new L,Hf=new L,wy=new L,zf=new Rr,Rl=class extends qn{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){let r=Math.pow(10,4),s=Math.cos(Ia*t),o=e.getIndex(),a=e.getAttribute("position"),c=o?o.count:a.count,l=[0,0,0],u=["a","b","c"],d=new Array(3),f=new Map,h=[];for(let g=0;g<c;g+=3){o?(l[0]=o.getX(g),l[1]=o.getX(g+1),l[2]=o.getX(g+2)):(l[0]=g,l[1]=g+1,l[2]=g+2);let{a:x,b:p,c:m}=zf;if(x.fromBufferAttribute(a,l[0]),p.fromBufferAttribute(a,l[1]),m.fromBufferAttribute(a,l[2]),zf.getNormal(wy),d[0]=`${Math.round(x.x*r)},${Math.round(x.y*r)},${Math.round(x.z*r)}`,d[1]=`${Math.round(p.x*r)},${Math.round(p.y*r)},${Math.round(p.z*r)}`,d[2]=`${Math.round(m.x*r)},${Math.round(m.y*r)},${Math.round(m.z*r)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let S=0;S<3;S++){let C=(S+1)%3,b=d[S],T=d[C],w=zf[u[S]],v=zf[u[C]],E=`${b}_${T}`,O=`${T}_${b}`,R=f.get(O);R?(wy.dot(R.normal)<=s&&(h.push(w.x,w.y,w.z),h.push(v.x,v.y,v.z)),f.set(O,null)):f.has(E)||f.set(E,{index0:l[S],index1:l[C],normal:wy.clone()})}}for(let g of f.values())if(g){let{index0:x,index1:p}=g;Vf.fromBufferAttribute(a,x),Hf.fromBufferAttribute(a,p),h.push(Vf.x,Vf.y,Vf.z),h.push(Hf.x,Hf.y,Hf.z)}this.setAttribute("position",new It(h,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};var vo=class n extends qn{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};let s=e/2,o=t/2,a=Math.floor(i),c=Math.floor(r),l=a+1,u=c+1,d=e/a,f=t/c,h=[],g=[],x=[],p=[];for(let m=0;m<u;m++){let S=m*f-o;for(let C=0;C<l;C++){let b=C*d-s;g.push(b,-S,0),x.push(0,0,1),p.push(C/a),p.push(1-m/c)}}for(let m=0;m<c;m++)for(let S=0;S<a;S++){let C=S+l*m,b=S+l*(m+1),T=S+1+l*(m+1),w=S+1+l*m;h.push(C,b,w),h.push(b,T,w)}this.setIndex(h),this.setAttribute("position",new It(g,3)),this.setAttribute("normal",new It(x,3)),this.setAttribute("uv",new It(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.widthSegments,e.heightSegments)}};var Va=class n extends qn{constructor(e=1,t=.4,i=12,r=48,s=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:r,arc:s,thetaStart:o,thetaLength:a},i=Math.floor(i),r=Math.floor(r);let c=[],l=[],u=[],d=[],f=new L,h=new L,g=new L;for(let x=0;x<=i;x++){let p=o+x/i*a;for(let m=0;m<=r;m++){let S=m/r*s;h.x=(e+t*Math.cos(p))*Math.cos(S),h.y=(e+t*Math.cos(p))*Math.sin(S),h.z=t*Math.sin(p),l.push(h.x,h.y,h.z),f.x=e*Math.cos(S),f.y=e*Math.sin(S),g.subVectors(h,f).normalize(),u.push(g.x,g.y,g.z),d.push(m/r),d.push(x/i)}}for(let x=1;x<=i;x++)for(let p=1;p<=r;p++){let m=(r+1)*x+p-1,S=(r+1)*(x-1)+p-1,C=(r+1)*(x-1)+p,b=(r+1)*x+p;c.push(m,S,b),c.push(S,C,b)}this.setIndex(c),this.setAttribute("position",new It(l,3)),this.setAttribute("normal",new It(u,3)),this.setAttribute("uv",new It(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc,e.thetaStart,e.thetaLength)}};function Eo(n){let e={};for(let t in n){e[t]={};for(let i in n[t]){let r=n[t][i];if(Eb(r))r.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone();else if(Array.isArray(r))if(Eb(r[0])){let s=[];for(let o=0,a=r.length;o<a;o++)s[o]=r[o].clone();e[t][i]=s}else e[t][i]=r.slice();else e[t][i]=r}}return e}function Mn(n){let e={};for(let t=0;t<n.length;t++){let i=Eo(n[t]);for(let r in i)e[r]=i[r]}return e}function Eb(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function BP(n){let e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function d_(n){let e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ot.workingColorSpace}var gw={clone:Eo,merge:Mn},VP=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,HP=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Qi=class extends Fr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=VP,this.fragmentShader=HP,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Eo(e.uniforms),this.uniformsGroups=BP(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let r in this.uniforms){let o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let i in e.uniforms){let r=e.uniforms[i];switch(this.uniforms[i]={},r.type){case"t":this.uniforms[i].value=t[r.value]||null;break;case"c":this.uniforms[i].value=new je().setHex(r.value);break;case"v2":this.uniforms[i].value=new et().fromArray(r.value);break;case"v3":this.uniforms[i].value=new L().fromArray(r.value);break;case"v4":this.uniforms[i].value=new At().fromArray(r.value);break;case"m3":this.uniforms[i].value=new Ue().fromArray(r.value);break;case"m4":this.uniforms[i].value=new wt().fromArray(r.value);break;default:this.uniforms[i].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},fh=class extends Qi{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},er=class extends Fr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new je(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new je(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=hp,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Lr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}};var hh=class extends Fr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ew,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ph=class extends Fr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ca(n,e){return!n||n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function Gf(n){return n!==void 0&&n.inTangents!==void 0&&n.outTangents!==void 0}var ys=class{constructor(e,t,i,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,r=t[i],s=t[i-1];n:{e:{let o;t:{i:if(!(e<r)){for(let a=i+2;;){if(r===void 0){if(e<s)break i;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(s=r,r=t[++i],e<r)break e}o=t.length;break t}if(!(e>=s)){let a=t[1];e<a&&(i=2,s=a);for(let c=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(r=s,s=t[--i-1],e>=s)break e}o=i,i=0;break t}break n}for(;i<o;){let a=i+o>>>1;e<t[a]?o=a:i=a+1}if(r=t[i],s=t[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,r)}return this.interpolate_(i,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=e*r;for(let o=0;o!==r;++o)t[o]=i[s+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},mh=class extends ys{constructor(e,t,i,r){super(e,t,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Dy,endingEnd:Dy}}intervalChanged_(e,t,i){let r=this.parameterPositions,s=e-2,o=e+1,a=r[s],c=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case Iy:s=e,a=2*t-i;break;case Ay:s=r.length-2,a=t+r[s]-r[s+1];break;default:s=e,a=i}if(c===void 0)switch(this.getSettings_().endingEnd){case Iy:o=e,c=2*i-t;break;case Ay:o=1,c=i+r[1]-r[0];break;default:o=e-1,c=t}let l=(i-t)*.5,u=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-i),this._offsetPrev=s*u,this._offsetNext=o*u}interpolate_(e,t,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,u=this._offsetPrev,d=this._offsetNext,f=this._weightPrev,h=this._weightNext,g=(i-t)/(r-t),x=g*g,p=x*g,m=-f*p+2*f*x-f*g,S=(1+f)*p+(-1.5-2*f)*x+(-.5+f)*g+1,C=(-1-h)*p+(1.5+h)*x+.5*g,b=h*p-h*x;for(let T=0;T!==a;++T)s[T]=m*o[u+T]+S*o[l+T]+C*o[c+T]+b*o[d+T];return s}},gh=class extends ys{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,u=(i-t)/(r-t),d=1-u;for(let f=0;f!==a;++f)s[f]=o[l+f]*d+o[c+f]*u;return s}},vh=class extends ys{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e){return this.copySampleValue_(e-1)}},yh=class extends ys{interpolate_(e,t,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,u=this.inTangents,d=this.outTangents;if(!u||!d){let g=(i-t)/(r-t),x=1-g;for(let p=0;p!==a;++p)s[p]=o[l+p]*x+o[c+p]*g;return s}let f=a*2,h=e-1;for(let g=0;g!==a;++g){let x=o[l+g],p=o[c+g],m=h*f+g*2,S=d[m],C=d[m+1],b=e*f+g*2,T=u[b],w=u[b+1],v=GP(i,t,S,T,r);s[g]=vw(v,x,C,w,p)}return s}};function vw(n,e,t,i,r){let s=1-n;return s*s*s*e+3*s*s*n*t+3*s*n*n*i+n*n*n*r}function zP(n,e,t,i,r){let s=1-n;return 3*s*s*(t-e)+6*s*n*(i-t)+3*n*n*(r-i)}function GP(n,e,t,i,r){let s=(n-e)/(r-e);for(let o=0;o<8;o++){let a=vw(s,e,t,i,r)-n;if(Math.abs(a)<1e-10)break;let c=zP(s,e,t,i,r);if(Math.abs(c)<1e-10)break;s=Math.max(0,Math.min(1,s-a/c))}return s}var Xn=class{constructor(e,t,i,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ca(t,this.TimeBufferType),this.values=Ca(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:Ca(e.times,Array),values:Ca(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(i.interpolation=r),Gf(e.settings)&&(i.settings={inTangents:Ca(e.settings.inTangents,Array),outTangents:Ca(e.settings.outTangents,Array)})}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new vh(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new gh(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new mh(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new yh(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case vl:t=this.InterpolantFactoryMethodDiscrete;break;case ih:t=this.InterpolantFactoryMethodLinear;break;case $f:t=this.InterpolantFactoryMethodSmooth;break;case Ty:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return Ae("KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return vl;case this.InterpolantFactoryMethodLinear:return ih;case this.InterpolantFactoryMethodSmooth:return $f;case this.InterpolantFactoryMethodBezier:return Ty}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]+=e;Gf(this.settings)&&(Mb(this.settings.inTangents,e),Mb(this.settings.outTangents,e))}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]*=e;Gf(this.settings)&&(bb(this.settings.inTangents,e),bb(this.settings.outTangents,e))}return this}trim(e,t){let i=this.times,r=i.length,s=0,o=r-1;for(;s!==r&&i[s]<e;)++s;for(;o!==-1&&i[o]>t;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);let a=this.getValueSize();this.times=i.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Fe("KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,r=this.values,s=i.length;s===0&&(Fe("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==s;a++){let c=i[a];if(typeof c=="number"&&isNaN(c)){Fe("KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){Fe("KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(r!==void 0&&sP(r))for(let a=0,c=r.length;a!==c;++a){let l=r[a];if(isNaN(l)){Fe("KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===$f,s=e.length-1,o=1;for(let a=1;a<s;++a){let c=!1,l=e[a],u=e[a+1];if(l!==u&&(a!==1||l!==e[0]))if(r)c=!0;else{let d=a*i,f=d-i,h=d+i;for(let g=0;g!==i;++g){let x=t[d+g];if(x!==t[f+g]||x!==t[h+g]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];let d=a*i,f=o*i;for(let h=0;h!==i;++h)t[f+h]=t[d+h]}++o}}if(s>0){e[o]=e[s];for(let a=s*i,c=o*i,l=0;l!==i;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,r=new i(this.name,e,t);return r.createInterpolant=this.createInterpolant,Gf(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Mb(n,e){for(let t=0,i=n.length;t!==i;t+=2)n[t]+=e}function bb(n,e){for(let t=0,i=n.length;t!==i;t+=2)n[t]*=e}Xn.prototype.ValueTypeName="";Xn.prototype.TimeBufferType=Float32Array;Xn.prototype.ValueBufferType=Float32Array;Xn.prototype.DefaultInterpolation=ih;var _s=class extends Xn{constructor(e,t,i){super(e,t,i)}};_s.prototype.ValueTypeName="bool";_s.prototype.ValueBufferType=Array;_s.prototype.DefaultInterpolation=vl;_s.prototype.InterpolantFactoryMethodLinear=void 0;_s.prototype.InterpolantFactoryMethodSmooth=void 0;var _h=class extends Xn{constructor(e,t,i,r){super(e,t,i,r)}};_h.prototype.ValueTypeName="color";var xh=class extends Xn{constructor(e,t,i,r){super(e,t,i,r)}};xh.prototype.ValueTypeName="number";var Sh=class extends ys{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(i-t)/(r-t),l=e*a;for(let u=l+a;l!==u;l+=4)Ji.slerpFlat(s,0,o,l-a,o,l,c);return s}},Nl=class extends Xn{constructor(e,t,i,r){super(e,t,i,r)}InterpolantFactoryMethodLinear(e){return new Sh(this.times,this.values,this.getValueSize(),e)}};Nl.prototype.ValueTypeName="quaternion";Nl.prototype.InterpolantFactoryMethodSmooth=void 0;var xs=class extends Xn{constructor(e,t,i){super(e,t,i)}};xs.prototype.ValueTypeName="string";xs.prototype.ValueBufferType=Array;xs.prototype.DefaultInterpolation=vl;xs.prototype.InterpolantFactoryMethodLinear=void 0;xs.prototype.InterpolantFactoryMethodSmooth=void 0;var Eh=class extends Xn{constructor(e,t,i,r){super(e,t,i,r)}};Eh.prototype.ValueTypeName="vector";var Mh=class{constructor(e,t,i){let r=this,s=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this._abortController=null,this.itemStart=function(u){a++,s===!1&&r.onStart!==void 0&&r.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,r.onProgress!==void 0&&r.onProgress(u,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,d){return l.push(u,d),this},this.removeHandler=function(u){let d=l.indexOf(u);return d!==-1&&l.splice(d,2),this},this.getHandler=function(u){for(let d=0,f=l.length;d<f;d+=2){let h=l[d],g=l[d+1];if(h.global&&(h.lastIndex=0),h.test(u))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},yw=new Mh,bh=class{constructor(e){this.manager=e!==void 0?e:yw,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let i=this;return new Promise(function(r,s){i.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}setPriority(e){return this.priority=e,this}setCache(e){return this.cache=e,this}abort(){return this}};bh.DEFAULT_MATERIAL_NAME="__DEFAULT";var Pl=class extends yn{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new je(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},Ol=class extends Pl{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(yn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new je(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},Cy=new wt,wb=new L,Cb=new L,wh=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new et(512,512),this.mapType=kn,this.map=null,this.mapPass=null,this.matrix=new wt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ms,this._frameExtents=new et(1,1),this._viewportCount=1,this._viewports=[new At(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;wb.setFromMatrixPosition(e.matrixWorld),t.position.copy(wb),Cb.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Cb),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,i,r){Cy.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),i.setFromProjectionMatrix(Cy,e.coordinateSystem,e.reversedDepth);let s=this._frameExtents,o=r?r.z/s.x:1,a=r?r.w/s.y:1,c=r?r.x/s.x:0,l=r?r.y/s.y:0;e.coordinateSystem===Na||e.reversedDepth?t.set(.5*o,0,0,.5*o+c,0,.5*a,0,.5*a+l,0,0,1,0,0,0,0,1):t.set(.5*o,0,0,.5*o+c,0,.5*a,0,.5*a+l,0,0,.5,.5,0,0,0,1),t.multiply(Cy)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},jf=new L,Wf=new Ji,Xi=new L,Ll=class extends yn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new wt,this.projectionMatrix=new wt,this.projectionMatrixInverse=new wt,this.coordinateSystem=ci,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(jf,Wf,Xi),Xi.x===1&&Xi.y===1&&Xi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(jf,Wf,Xi.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(jf,Wf,Xi),Xi.x===1&&Xi.y===1&&Xi.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(jf,Wf,Xi.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},fs=new L,Tb=new et,Db=new et,Dn=class extends Ll{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Oa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ia*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Oa*2*Math.atan(Math.tan(Ia*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){fs.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(fs.x,fs.y).multiplyScalar(-e/fs.z),fs.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(fs.x,fs.y).multiplyScalar(-e/fs.z)}getViewSize(e,t){return this.getViewBounds(e,Tb,Db),t.subVectors(Db,Tb)}setViewOffset(e,t,i,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ia*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;s+=o.offsetX*r/c,t-=o.offsetY*i/l,r*=o.width/c,i*=o.height/l}let a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var Fl=class extends Ll{constructor(e=-1,t=1,i=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=i-e,o=i+e,a=r+t,c=r-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,o=s+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Ry=class extends wh{constructor(){super(new Fl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},kl=class extends Pl{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(yn.DEFAULT_UP),this.updateMatrix(),this.target=new yn,this.shadow=new Ry}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var Ta=-90,Da=1,Ha=class extends yn{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Dn(Ta,Da,e,t);r.layers=this.layers,this.add(r);let s=new Dn(Ta,Da,e,t);s.layers=this.layers,this.add(s);let o=new Dn(Ta,Da,e,t);o.layers=this.layers,this.add(o);let a=new Dn(Ta,Da,e,t);a.layers=this.layers,this.add(a);let c=new Dn(Ta,Da,e,t);c.layers=this.layers,this.add(c);let l=new Dn(Ta,Da,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,r,s,o,a,c]=t;for(let l of t)this.remove(l);if(e===ci)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Na)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,o,a,c,l,u]=this.children,d=e.getRenderTarget(),f=e.getActiveCubeFace(),h=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let x=i.texture.mipmapsAutoUpdate;i.texture.mipmapsAutoUpdate=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(i,0,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(i,1,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,2,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,3,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(i,4,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),i.texture.mipmapsAutoUpdate=x,e.setRenderTarget(i,5,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(d,f,h),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}},Ch=class extends Dn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}};var f_="\\[\\]\\.:\\/",jP=new RegExp("["+f_+"]","g"),h_="[^"+f_+"]",WP="[^"+f_.replace("\\.","")+"]",$P=/((?:WC+[\/:])*)/.source.replace("WC",h_),qP=/(WCOD+)?/.source.replace("WCOD",WP),XP=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",h_),YP=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",h_),ZP=new RegExp("^"+$P+qP+XP+YP+"$"),KP=["material","materials","bones","map"],Ny=class{constructor(e,t,i){let r=i||Ct.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=i.length;r!==s;++r)i[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},Ct=class n{constructor(e,t,i){this.path=t,this.parsedPath=i||n.parseTrackName(t),this.node=n.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new n.Composite(e,t,i):new n(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(jP,"")}static parseTrackName(e){let t=ZP.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=i.nodeName&&i.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=i.nodeName.substring(r+1);KP.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,r),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){let i=function(s){for(let o=0;o<s.length;o++){let a=s[o];if(a.name===t||a.uuid===t)return a;let c=i(a.children);if(c)return c}return null},r=i(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)e[t++]=i[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let i=this.resolvedProperty;for(let r=0,s=i.length;r!==s;++r)i[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,i=t.objectName,r=t.propertyName,s=t.propertyIndex;if(e||(e=n.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ae("PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=t.objectIndex;switch(i){case"materials":if(!e.material){Fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Fe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Fe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===l){l=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Fe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Fe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){Fe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(l!==void 0){if(e[l]===void 0){Fe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let o=e[r];if(o===void 0){let l=t.nodeName;Fe("PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){Fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Fe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ct.Composite=Ny;Ct.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ct.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ct.prototype.GetterByBindingType=[Ct.prototype._getValue_direct,Ct.prototype._getValue_array,Ct.prototype._getValue_arrayElement,Ct.prototype._getValue_toArray];Ct.prototype.SetterByBindingTypeAndVersioning=[[Ct.prototype._setValue_direct,Ct.prototype._setValue_direct_setNeedsUpdate,Ct.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ct.prototype._setValue_array,Ct.prototype._setValue_array_setNeedsUpdate,Ct.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ct.prototype._setValue_arrayElement,Ct.prototype._setValue_arrayElement_setNeedsUpdate,Ct.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ct.prototype._setValue_fromArray,Ct.prototype._setValue_fromArray_setNeedsUpdate,Ct.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var LX=new Float32Array(1);var Ib=new wt,Ul=class{constructor(e,t,i=0,r=1/0){this.ray=new Ua(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new Fa,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Fe("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ib.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ib),this}intersectObject(e,t=!0,i=[]){return Py(e,this,i,t),i.sort(Ab),i}intersectObjects(e,t=!0,i=[]){for(let r=0,s=e.length;r<s;r++)Py(e[r],this,i,t);return i.sort(Ab),i}};function Ab(n,e){return n.distance-e.distance}function Py(n,e,t,i){let r=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(r=!1),r===!0&&i===!0){let s=n.children;for(let o=0,a=s.length;o<a;o++)Py(s[o],e,t,!0)}}var Bl=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Ae("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}};var Oy=class{static{this.prototype.isMatrix2=!0}constructor(e,t,i,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,r){let s=this.elements;return s[0]=e,s[2]=t,s[1]=i,s[3]=r,this}};function p_(n,e,t,i){let r=JP(i);switch(t){case e_:return n*e;case n_:return n*e/r.components*r.byteLength;case Oh:return n*e/r.components*r.byteLength;case Es:return n*e*2/r.components*r.byteLength;case Lh:return n*e*2/r.components*r.byteLength;case t_:return n*e*3/r.components*r.byteLength;case Ti:return n*e*4/r.components*r.byteLength;case Fh:return n*e*4/r.components*r.byteLength;case zl:case Gl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case jl:case Wl:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Uh:case Vh:return Math.max(n,16)*Math.max(e,8)/4;case kh:case Bh:return Math.max(n,8)*Math.max(e,8)/2;case Hh:case zh:case jh:case Wh:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Gh:case $l:case $h:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case qh:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Xh:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Yh:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Zh:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Kh:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case Jh:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Qh:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case ep:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case tp:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case np:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case ip:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case rp:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case sp:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case op:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case ap:case cp:case lp:return Math.ceil(n/4)*Math.ceil(e/4)*16;case up:case dp:return Math.ceil(n/4)*Math.ceil(e/4)*8;case ql:case fp:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function JP(n){switch(n){case kn:case Zy:return{byteLength:1,components:1};case Wa:case Ky:case Ci:return{byteLength:2,components:1};case Nh:case Ph:return{byteLength:2,components:4};case bi:case Rh:case wi:return{byteLength:4,components:1};case Jy:case Qy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function Vw(){let n=null,e=!1,t=null,i=null;function r(s,o){i=n.requestAnimationFrame(r),t(s,o)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function eO(n){let e=new WeakMap;function t(a,c){let l=a.array,u=a.usage,d=l.byteLength,f=n.createBuffer();n.bindBuffer(c,f),n.bufferData(c,l,u),a.onUploadCallback();let h;if(l instanceof Float32Array)h=n.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)h=n.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?h=n.HALF_FLOAT:h=n.UNSIGNED_SHORT;else if(l instanceof Int16Array)h=n.SHORT;else if(l instanceof Uint32Array)h=n.UNSIGNED_INT;else if(l instanceof Int32Array)h=n.INT;else if(l instanceof Int8Array)h=n.BYTE;else if(l instanceof Uint8Array)h=n.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)h=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:h,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:d}}function i(a,c,l){let u=c.array,d=c.updateRanges;if(n.bindBuffer(l,a),d.length===0)n.bufferSubData(l,0,u);else{d.sort((h,g)=>h.start-g.start);let f=0;for(let h=1;h<d.length;h++){let g=d[f],x=d[h];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++f,d[f]=x)}d.length=f+1;for(let h=0,g=d.length;h<g;h++){let x=d[h];n.bufferSubData(l,x.start*u.BYTES_PER_ELEMENT,u,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);let c=e.get(a);c&&(n.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,a,c),l.version=a.version}}return{get:r,remove:s,update:o}}var tO=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,nO=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,iO=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,rO=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,sO=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,oO=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aO=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,cO=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,lO=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,uO=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,dO=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,fO=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,hO=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,pO=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,mO=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,gO=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,vO=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,yO=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,_O=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,xO=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,SO=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,EO=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,MO=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,bO=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,wO=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,CO=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,TO=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,DO=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,IO=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,AO="gl_FragColor = linearToOutputTexel( gl_FragColor );",RO=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,NO=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,PO=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,OO=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,LO=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,FO=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,kO=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,UO=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,BO=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,VO=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,HO=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,zO=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,GO=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,jO=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,WO=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,$O=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,qO=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,XO=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,YO=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ZO=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,KO=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,JO=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,QO=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,eL=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,tL=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,nL=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,iL=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,rL=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sL=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,oL=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,aL=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,cL=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,lL=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,uL=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dL=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,fL=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,hL=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,pL=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,mL=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,gL=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,vL=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,yL=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,_L=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,xL=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,SL=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,EL=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,ML=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,bL=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wL=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,CL=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,TL=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,DL=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,IL=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,AL=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,RL=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,NL=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,PL=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,OL=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,LL=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,FL=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,kL=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,UL=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,BL=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,VL=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,HL=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,zL=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,GL=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,jL=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,WL=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,$L=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,qL=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,XL=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,YL=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,ZL=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,KL=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,JL=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,QL=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,eF=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,tF=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,iF=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sF=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,oF=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,aF=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,cF=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,lF=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,uF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,dF=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fF=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,hF=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,pF=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,mF=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gF=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,vF=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yF=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,_F=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,xF=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,SF=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,EF=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,MF=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bF=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,wF=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,CF=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,TF=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,DF=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,IF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,AF=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,RF=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,NF=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,PF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qe={alphahash_fragment:tO,alphahash_pars_fragment:nO,alphamap_fragment:iO,alphamap_pars_fragment:rO,alphatest_fragment:sO,alphatest_pars_fragment:oO,aomap_fragment:aO,aomap_pars_fragment:cO,batching_pars_vertex:lO,batching_vertex:uO,begin_vertex:dO,beginnormal_vertex:fO,bsdfs:hO,iridescence_fragment:pO,bumpmap_pars_fragment:mO,clipping_planes_fragment:gO,clipping_planes_pars_fragment:vO,clipping_planes_pars_vertex:yO,clipping_planes_vertex:_O,color_fragment:xO,color_pars_fragment:SO,color_pars_vertex:EO,color_vertex:MO,common:bO,defaultnormal_vertex:wO,displacementmap_pars_vertex:CO,displacementmap_vertex:TO,emissivemap_fragment:DO,emissivemap_pars_fragment:IO,colorspace_fragment:AO,colorspace_pars_fragment:RO,envmap_fragment:NO,envmap_common_pars_fragment:PO,envmap_pars_fragment:OO,envmap_pars_vertex:LO,envmap_physical_pars_fragment:$O,envmap_vertex:FO,fog_vertex:kO,fog_pars_vertex:UO,fog_fragment:BO,fog_pars_fragment:VO,gradientmap_pars_fragment:HO,lightmap_pars_fragment:zO,lights_lambert_fragment:GO,lights_lambert_pars_fragment:jO,lights_pars_begin:WO,lights_toon_fragment:qO,lights_toon_pars_fragment:XO,lights_phong_fragment:YO,lights_phong_pars_fragment:ZO,lights_physical_fragment:KO,lights_physical_pars_fragment:JO,lights_fragment_begin:QO,lights_fragment_maps:eL,lights_fragment_end:tL,lightprobes_pars_fragment:nL,logdepthbuf_fragment:iL,logdepthbuf_pars_fragment:rL,logdepthbuf_pars_vertex:sL,logdepthbuf_vertex:oL,map_fragment:aL,map_pars_fragment:cL,map_particle_fragment:lL,map_particle_pars_fragment:uL,metalnessmap_fragment:dL,metalnessmap_pars_fragment:fL,morphinstance_vertex:hL,morphcolor_vertex:pL,morphnormal_vertex:mL,morphtarget_pars_vertex:gL,morphtarget_vertex:vL,normal_fragment_begin:yL,normal_fragment_maps:_L,normal_pars_fragment:xL,normal_pars_vertex:SL,normal_vertex:EL,normalmap_pars_fragment:ML,clearcoat_normal_fragment_begin:bL,clearcoat_normal_fragment_maps:wL,clearcoat_pars_fragment:CL,iridescence_pars_fragment:TL,opaque_fragment:DL,packing:IL,premultiplied_alpha_fragment:AL,project_vertex:RL,dithering_fragment:NL,dithering_pars_fragment:PL,roughnessmap_fragment:OL,roughnessmap_pars_fragment:LL,shadowmap_pars_fragment:FL,shadowmap_pars_vertex:kL,shadowmap_vertex:UL,shadowmask_pars_fragment:BL,skinbase_vertex:VL,skinning_pars_vertex:HL,skinning_vertex:zL,skinnormal_vertex:GL,specularmap_fragment:jL,specularmap_pars_fragment:WL,tonemapping_fragment:$L,tonemapping_pars_fragment:qL,transmission_fragment:XL,transmission_pars_fragment:YL,uv_pars_fragment:ZL,uv_pars_vertex:KL,uv_vertex:JL,worldpos_vertex:QL,background_vert:eF,background_frag:tF,backgroundCube_vert:nF,backgroundCube_frag:iF,cube_vert:rF,cube_frag:sF,depth_vert:oF,depth_frag:aF,distance_vert:cF,distance_frag:lF,equirect_vert:uF,equirect_frag:dF,linedashed_vert:fF,linedashed_frag:hF,meshbasic_vert:pF,meshbasic_frag:mF,meshlambert_vert:gF,meshlambert_frag:vF,meshmatcap_vert:yF,meshmatcap_frag:_F,meshnormal_vert:xF,meshnormal_frag:SF,meshphong_vert:EF,meshphong_frag:MF,meshphysical_vert:bF,meshphysical_frag:wF,meshtoon_vert:CF,meshtoon_frag:TF,points_vert:DF,points_frag:IF,shadow_vert:AF,shadow_frag:RF,sprite_vert:NF,sprite_frag:PF},me={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new et(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new et(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},rr={basic:{uniforms:Mn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:Mn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new je(0)},envMapIntensity:{value:1}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:Mn([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:Mn([me.common,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.roughnessmap,me.metalnessmap,me.fog,me.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:Mn([me.common,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.gradientmap,me.fog,me.lights,{emissive:{value:new je(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:Mn([me.common,me.bumpmap,me.normalmap,me.displacementmap,me.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:Mn([me.points,me.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:Mn([me.common,me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:Mn([me.common,me.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:Mn([me.common,me.bumpmap,me.normalmap,me.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:Mn([me.sprite,me.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distance:{uniforms:Mn([me.common,me.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distance_vert,fragmentShader:Qe.distance_frag},shadow:{uniforms:Mn([me.lights,me.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};rr.physical={uniforms:Mn([rr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new et(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Ue},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new et},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new et},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};var pp={r:0,b:0,g:0},OF=new wt,Hw=new Ue;Hw.set(-1,0,0,0,1,0,0,0,1);function LF(n,e,t,i,r,s){let o=new je(0),a=r===!0?0:1,c,l,u=null,d=0,f=null;function h(S){let C=S.isScene===!0?S.background:null;if(C&&C.isTexture){let b=S.backgroundBlurriness>0;C=e.get(C,b)}return C}function g(S){let C=!1,b=h(S);b===null?p(o,a):b&&b.isColor&&(p(b,1),C=!0);let T=n.xr.getEnvironmentBlendMode();T==="additive"?t.buffers.color.setClear(0,0,0,1,s):T==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(n.autoClear||C)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function x(S,C){let b=h(C);b&&b.isCubeTexture?(l===void 0&&(l=new Wt(new gs(1,1,1),new Qi({name:"BackgroundCubeMaterial",uniforms:Eo(rr.backgroundCube.uniforms),vertexShader:rr.backgroundCube.vertexShader,fragmentShader:rr.backgroundCube.fragmentShader,side:An,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(T,w,v){this.matrixWorld.copyPosition(v.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(l)),l.material.uniforms.envMap.value=b,l.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(OF.makeRotationFromEuler(C.backgroundRotation)).transpose(),b.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Hw),l.material.toneMapped=ot.getTransfer(b.colorSpace)!==gt,(u!==b||d!==b.version||f!==n.toneMapping)&&(l.material.needsUpdate=!0,u=b,d=b.version,f=n.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new Wt(new vo(2,2),new Qi({name:"BackgroundMaterial",uniforms:Eo(rr.background.uniforms),vertexShader:rr.background.vertexShader,fragmentShader:rr.background.fragmentShader,side:Ss,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.toneMapped=ot.getTransfer(b.colorSpace)!==gt,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(u!==b||d!==b.version||f!==n.toneMapping)&&(c.material.needsUpdate=!0,u=b,d=b.version,f=n.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null))}function p(S,C){S.getRGB(pp,d_(n)),t.buffers.color.setClear(pp.r,pp.g,pp.b,C,s)}function m(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(S,C=1){o.set(S),a=C,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(S){a=S,p(o,a)},render:g,addToRenderList:x,dispose:m}}function FF(n,e){let t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=f(null),s=r,o=!1;function a(P,U,G,I,z){let $=!1,H=d(P,I,G,U);s!==H&&(s=H,l(s.object)),$=h(P,I,G,z),$&&g(P,I,G,z),z!==null&&e.update(z,n.ELEMENT_ARRAY_BUFFER),($||o)&&(o=!1,b(P,U,G,I),z!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function c(){return n.createVertexArray()}function l(P){return n.bindVertexArray(P)}function u(P){return n.deleteVertexArray(P)}function d(P,U,G,I){let z=I.wireframe===!0,$=i[U.id];$===void 0&&($={},i[U.id]=$);let H=P.isInstancedMesh===!0?P.id:0,te=$[H];te===void 0&&(te={},$[H]=te);let W=te[G.id];W===void 0&&(W={},te[G.id]=W);let J=W[z];return J===void 0&&(J=f(c()),W[z]=J),J}function f(P){let U=[],G=[],I=[];for(let z=0;z<t;z++)U[z]=0,G[z]=0,I[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:U,enabledAttributes:G,attributeDivisors:I,object:P,attributes:{},index:null}}function h(P,U,G,I){let z=s.attributes,$=U.attributes,H=0,te=G.getAttributes();for(let W in te)if(te[W].location>=0){let Q=z[W],Me=$[W];if(Me===void 0&&(W==="instanceMatrix"&&P.instanceMatrix&&(Me=P.instanceMatrix),W==="instanceColor"&&P.instanceColor&&(Me=P.instanceColor)),Q===void 0||Q.attribute!==Me||Me&&Q.data!==Me.data)return!0;H++}return s.attributesNum!==H||s.index!==I}function g(P,U,G,I){let z={},$=U.attributes,H=0,te=G.getAttributes();for(let W in te)if(te[W].location>=0){let Q=$[W];Q===void 0&&(W==="instanceMatrix"&&P.instanceMatrix&&(Q=P.instanceMatrix),W==="instanceColor"&&P.instanceColor&&(Q=P.instanceColor));let Me={};Me.attribute=Q,Q&&Q.data&&(Me.data=Q.data),z[W]=Me,H++}s.attributes=z,s.attributesNum=H,s.index=I}function x(){let P=s.newAttributes;for(let U=0,G=P.length;U<G;U++)P[U]=0}function p(P){m(P,0)}function m(P,U){let G=s.newAttributes,I=s.enabledAttributes,z=s.attributeDivisors;G[P]=1,I[P]===0&&(n.enableVertexAttribArray(P),I[P]=1),z[P]!==U&&(n.vertexAttribDivisor(P,U),z[P]=U)}function S(){let P=s.newAttributes,U=s.enabledAttributes;for(let G=0,I=U.length;G<I;G++)U[G]!==P[G]&&(n.disableVertexAttribArray(G),U[G]=0)}function C(P,U,G,I,z,$,H){H===!0?n.vertexAttribIPointer(P,U,G,z,$):n.vertexAttribPointer(P,U,G,I,z,$)}function b(P,U,G,I){x();let z=I.attributes,$=G.getAttributes(),H=U.defaultAttributeValues;for(let te in $){let W=$[te];if(W.location>=0){let J=z[te];if(J===void 0&&(te==="instanceMatrix"&&P.instanceMatrix&&(J=P.instanceMatrix),te==="instanceColor"&&P.instanceColor&&(J=P.instanceColor)),J!==void 0){let Q=J.normalized,Me=J.itemSize,He=e.get(J);if(He===void 0)continue;let Y=He.buffer,ge=He.type,xe=He.bytesPerElement,Re=ge===n.INT||ge===n.UNSIGNED_INT||J.gpuType===Rh;if(J.isInterleavedBufferAttribute){let ve=J.data,We=ve.isInterleavedBuffer===!0?ve.stride:ve.itemSize,kt=J.offset;if(ve.isInstancedInterleavedBuffer||ve.isInstancedBufferAttribute){for(let Oe=0;Oe<W.locationSize;Oe++)m(W.location+Oe,ve.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=ve.meshPerAttribute*ve.count)}else for(let Oe=0;Oe<W.locationSize;Oe++)p(W.location+Oe);n.bindBuffer(n.ARRAY_BUFFER,Y);for(let Oe=0;Oe<W.locationSize;Oe++)C(W.location+Oe,Me/W.locationSize,ge,Q,We*xe,(kt+Me/W.locationSize*Oe)*xe,Re)}else{if(J.isInstancedBufferAttribute){for(let ve=0;ve<W.locationSize;ve++)m(W.location+ve,J.meshPerAttribute);P.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let ve=0;ve<W.locationSize;ve++)p(W.location+ve);n.bindBuffer(n.ARRAY_BUFFER,Y);for(let ve=0;ve<W.locationSize;ve++)C(W.location+ve,Me/W.locationSize,ge,Q,Me*xe,Me/W.locationSize*ve*xe,Re)}}else if(H!==void 0){let Q=H[te];if(Q!==void 0)switch(Q.length){case 2:n.vertexAttrib2fv(W.location,Q);break;case 3:n.vertexAttrib3fv(W.location,Q);break;case 4:n.vertexAttrib4fv(W.location,Q);break;default:n.vertexAttrib1fv(W.location,Q)}}}}S()}function T(){O();for(let P in i){let U=i[P];for(let G in U){let I=U[G];for(let z in I){let $=I[z];for(let H in $)u($[H].object),delete $[H];delete I[z]}}delete i[P]}}function w(P){if(i[P.id]===void 0)return;let U=i[P.id];for(let G in U){let I=U[G];for(let z in I){let $=I[z];for(let H in $)u($[H].object),delete $[H];delete I[z]}}delete i[P.id]}function v(P){for(let U in i){let G=i[U];for(let I in G){let z=G[I];if(z[P.id]===void 0)continue;let $=z[P.id];for(let H in $)u($[H].object),delete $[H];delete z[P.id]}}}function E(P){for(let U in i){let G=i[U],I=P.isInstancedMesh===!0?P.id:0,z=G[I];if(z!==void 0){for(let $ in z){let H=z[$];for(let te in H)u(H[te].object),delete H[te];delete z[$]}delete G[I],Object.keys(G).length===0&&delete i[U]}}}function O(){R(),o=!0,s!==r&&(s=r,l(s.object))}function R(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:O,resetDefaultState:R,dispose:T,releaseStatesOfGeometry:w,releaseStatesOfObject:E,releaseStatesOfProgram:v,initAttributes:x,enableAttribute:p,disableUnusedAttributes:S}}function kF(n,e,t){let i;function r(c){i=c}function s(c,l){n.drawArrays(i,c,l),t.update(l,i,1)}function o(c,l,u){u!==0&&(n.drawArraysInstanced(i,c,l,u),t.update(l,i,u))}function a(c,l,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,l,0,u);let f=0;for(let h=0;h<u;h++)f+=l[h];t.update(f,i,1)}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a}function UF(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){let v=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(v.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(v){return!(v!==Ti&&i.convert(v)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(v){let E=v===Ci&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(v!==kn&&v!==wi&&!E&&i.convert(v)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE))}function c(v){if(v==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";v="mediump"}return v==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp",u=c(l);u!==l&&(Ae("WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);let d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=t.logarithmicDepthBuffer===!0&&d===!1;t.reversedDepthBuffer===!0&&d===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),t.logarithmicDepthBuffer===!0&&d===!0&&Ae("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");let h=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_TEXTURE_SIZE),p=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),m=n.getParameter(n.MAX_VERTEX_ATTRIBS),S=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),C=n.getParameter(n.MAX_VARYING_VECTORS),b=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),T=n.getParameter(n.MAX_SAMPLES),w=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:h,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:S,maxVaryings:C,maxFragmentUniforms:b,maxSamples:T,samples:w}}function BF(n){let e=this,t=null,i=0,r=!1,s=!1,o=new Mi,a=new Ue,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,f){let h=d.length!==0||f||i!==0||r;return r=f,i=d.length,h},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,f){t=u(d,f,0)},this.setState=function(d,f,h){let g=d.clippingPlanes,x=d.clipIntersection,p=d.clipShadows,m=n.get(d);if(!r||g===null||g.length===0||s&&!p)s?u(null):l();else{let S=s?0:i,C=S*4,b=m.clippingState||null;c.value=b,b=u(g,f,C,h);for(let T=0;T!==C;++T)b[T]=t[T];m.clippingState=b,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=S}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(d,f,h,g){let x=d!==null?d.length:0,p=null;if(x!==0){if(p=c.value,g!==!0||p===null){let m=h+x*4,S=f.matrixWorldInverse;a.getNormalMatrix(S),(p===null||p.length<m)&&(p=new Float32Array(m));for(let C=0,b=h;C!==x;++C,b+=4)o.copy(d[C]).applyMatrix4(S,a),o.normal.toArray(p,b),p[b+3]=o.constant}c.value=p,c.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,p}}var Zl=class extends $n{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new Tl(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new gs(5,5,5),s=new Qi({name:"CubemapFromEquirect",uniforms:Eo(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:An,blending:yo});s.uniforms.tEquirect.value=t;let o=new Wt(r,s),a=t.minFilter;return t.minFilter===Ur&&(t.minFilter=In),new Ha(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){let s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,r);e.setRenderTarget(s)}},_w=256,VF=3,HF=20,zw=256,Gw=16,zF=3,GF=new L,jF=new je,gp=class n{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new Ha(1,10,null),this._boxMesh=new Wt(new gs(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,i=.1,r=100,s={}){let{size:o=256,position:a=GF}=s,c=this._renderer;this._setSize(o);let l=this._allocateTarget(),u=this._getSourceTarget(!0);t>0&&(u.texture.mipmapsAutoUpdate=!1);let d=c.autoClear,f=c.autoClearColor,h=c.autoClearDepth,g=c.autoClearStencil,x=e.background;c.autoClear=!0,c.autoClearColor=!0,c.autoClearDepth=!0,c.autoClearStencil=!0,x===null&&(e.background=c.getClearColor(jF));let p=new Ha(i,r,u);return p.position.copy(a),p.update(c,e),c.autoClear=d,c.autoClearColor=f,c.autoClearDepth=h,c.autoClearStencil=g,e.background=x,t>0&&(u.texture.mipmapsAutoUpdate=!0,this._blur(l,t)),this._applyPMREM(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ew(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Sw(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(_w,l_(e))}_fromTexture(e,t){e.mapping===xo||e.mapping===ja?this._setSize(e.image.length===0?_w:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let i=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(i),i}_allocateTarget(){let e=this._cubeSize,t=xw(e,!1,!1),i=Math.log2(e)-VF;for(let r=0;r<=i;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name="PMREM",t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,i=this._sourceTarget;return(i===null||i.width!==t||e&&i.depthBuffer===!1)&&(i!==null&&i.dispose(),this._sourceTarget=xw(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,i){let r=this._boxMesh,s=this._cubeCamera;r.material=i,s.renderTarget=e,s.activeMipmapLevel=t;let o=e.width>>t;e.viewport.set(0,0,o,o),s.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===xo||e.mapping===ja?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ew()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Sw()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=WF(),this._integrationMaterial=$F());let t=this._cubeSize,i=e.texture.mipmaps.length-1,r=this._ggxMaterial.uniforms;r.envMap.value=this._sourceTarget.texture;let s=this._integrationMaterial.uniforms;s.envMap.value=this._sourceTarget.texture,s.sourceLod.value=Math.log2(t/Gw);for(let o=0;o<=i;o++){let a=n.lodToRoughness(o,i);if(o>i-zF)s.roughness.value=a,this._renderCube(e,o,this._integrationMaterial);else{let c=a>0?Math.log2(t)+.5*Math.log2(6/(zw*Math.pow(a,4)))+.5:0;r.roughness.value=a,r.lodBias.value=c,this._renderCube(e,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=qF());let i=this._blurMaterial,r=i.uniforms,s=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=s.texture,this._renderCube(e,0,i),r.envMap.value=e.texture,this._renderCube(s,0,i)}};function xw(n,e,t){return new Zl(n,{minFilter:Ur,generateMipmaps:e,type:Ci,colorSpace:yl,depthBuffer:t})}function Kl(n,e,t){return new Qi({name:n,uniforms:e,vertexShader:Qe.cube_vert,fragmentShader:t,side:An,blending:yo,depthTest:!1,depthWrite:!1})}function WF(){return Kl("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${zw}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function $F(){return Kl("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Gw}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function qF(){return Kl("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${HF}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Sw(){return Kl("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Ew(){return Kl("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function XF(n){let e=new WeakMap,t=new WeakMap,i=null;function r(f,h=!1){return f==null?null:h?o(f):s(f)}function s(f){if(f&&f.isTexture){let h=f.mapping;if(h===Dh||h===Ih)if(e.has(f)){let g=e.get(f).texture;return a(g,f.mapping)}else{let g=f.image;if(g&&g.height>0){let x=new Zl(g.height);return x.fromEquirectangularTexture(n,f),e.set(f,x),f.addEventListener("dispose",l),a(x.texture,f.mapping)}else return null}}return f}function o(f){if(f&&f.isTexture&&f.isPMREMTexture!==!0){let h=f.mapping,g=h===Dh||h===Ih,x=h===xo||h===ja;if(g||x){let p=t.get(f),m=p!==void 0?p.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==m)return i===null&&(i=new gp(n)),p=g?i.fromEquirectangular(f,p):i.fromCubemap(f,p),p.texture.pmremVersion=f.pmremVersion,t.set(f,p),p.texture;if(p!==void 0)return p.texture;{let S=f.image;return g&&S&&S.height>0||x&&S&&c(S)?(i===null&&(i=new gp(n)),p=g?i.fromEquirectangular(f):i.fromCubemap(f),p.texture.pmremVersion=f.pmremVersion,t.set(f,p),f.addEventListener("dispose",u),p.texture):null}}}return f}function a(f,h){return h===Dh?f.mapping=xo:h===Ih&&(f.mapping=ja),f}function c(f){let h=0,g=6;for(let x=0;x<g;x++)f[x]!==void 0&&h++;return h===g}function l(f){let h=f.target;h.removeEventListener("dispose",l);let g=e.get(h);g!==void 0&&(e.delete(h),g.dispose())}function u(f){let h=f.target;h.removeEventListener("dispose",u);let g=t.get(h);g!==void 0&&(t.delete(h),g.dispose())}function d(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:r,dispose:d}}function YF(n){let e={};function t(i){if(e[i]!==void 0)return e[i];let r=n.getExtension(i);return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){let r=t(i);return r===null&&ml("WebGLRenderer: "+i+" extension not supported."),r}}}function ZF(n,e,t,i){let r={},s=new WeakMap,o=new FinalizationRegistry(g=>delete r[g]);function a(g){c(g.target)}function c(g){g.index!==null&&e.remove(g.index);for(let p in g.attributes)e.remove(g.attributes[p]);g.removeEventListener("dispose",a),delete r[g.id],o.unregister(g);let x=s.get(g);x&&(e.remove(x),s.delete(g)),i.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,t.memory.geometries--}function l(g,x){return r[x.id]!==void 0||(x.addEventListener("dispose",a),r[x.id]=new WeakRef(x),o.register(x,x.id,x),t.memory.geometries++),x}function u(g){let x=g.attributes;for(let p in x)e.update(x[p],n.ARRAY_BUFFER)}function d(g){let x=g.index,p=g.attributes.position,m=0;if(p===void 0)return;let S=x!==null?x.array.length:p.array.length/3-1,C=p.count>=65535?wl:bl,b=new C(Math.ceil(S/3)*6,1),T=b.array;if(x!==null){let v=x.array;m=x.version;for(let E=0,O=0;E<S;E+=3){let R=v[E+0],P=v[E+1],U=v[E+2];T[O++]=R,T[O++]=P,T[O++]=P,T[O++]=U,T[O++]=U,T[O++]=R}}else{m=p.version;for(let v=0,E=0;v<S;v+=3){let O=v+0,R=v+1,P=v+2;T[E++]=O,T[E++]=R,T[E++]=R,T[E++]=P,T[E++]=P,T[E++]=O}}b.version=m;let w=s.get(g);w&&e.remove(w),s.set(g,b)}function f(g){let x=s.get(g);if(x){let p=g.index;p!==null&&x.version<p.version&&d(g)}else d(g);return s.get(g)}function h(){for(let g in r){let x=r[g].deref();x!==void 0&&c(x)}}return{get:l,update:u,getWireframeAttribute:f,dispose:h}}function KF(n,e,t){let i;function r(d){i=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function c(d,f){n.drawElements(i,f,s,d*o),t.update(f,i,1)}function l(d,f,h){h!==0&&(n.drawElementsInstanced(i,f,s,d*o,h),t.update(f,i,h))}function u(d,f,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,f,0,s,d,0,h);let x=0;for(let p=0;p<h;p++)x+=f[p];t.update(x,i,1)}this.setMode=r,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function JF(n){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(s/3);break;case n.LINES:t.lines+=a*(s/2);break;case n.LINE_STRIP:t.lines+=a*(s-1);break;case n.LINE_LOOP:t.lines+=a*s;break;case n.POINTS:t.points+=a*s;break;default:Fe("WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function QF(n,e,t){let i=new WeakMap,r=new At;function s(o,a,c){let l=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=u!==void 0?u.length:0,f=i.get(a);if(f===void 0||f.count!==d){let O=function(){v.dispose(),i.delete(a),a.removeEventListener("dispose",O)};f!==void 0&&f.texture.dispose();let h=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],S=a.morphAttributes.color||[],C=0;h===!0&&(C=1),g===!0&&(C=2),x===!0&&(C=3);let b=a.attributes.position.count*C,T=1;b>e.maxTextureSize&&(T=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);let w=new Float32Array(b*T*4*d),v=new Sl(w,b,T,d);v.type=wi,v.needsUpdate=!0;let E=C*4;for(let R=0;R<d;R++){let P=p[R],U=m[R],G=S[R],I=b*T*4*R;for(let z=0;z<P.count;z++){let $=z*E;h===!0&&(r.fromBufferAttribute(P,z),w[I+$+0]=r.x,w[I+$+1]=r.y,w[I+$+2]=r.z,w[I+$+3]=0),g===!0&&(r.fromBufferAttribute(U,z),w[I+$+4]=r.x,w[I+$+5]=r.y,w[I+$+6]=r.z,w[I+$+7]=0),x===!0&&(r.fromBufferAttribute(G,z),w[I+$+8]=r.x,w[I+$+9]=r.y,w[I+$+10]=r.z,w[I+$+11]=G.itemSize===4?r.w:1)}}f={count:d,texture:v,size:new et(b,T)},i.set(a,f),a.addEventListener("dispose",O)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let h=0;for(let x=0;x<l.length;x++)h+=l[x];let g=a.morphTargetsRelative?1:1-h;c.getUniforms().setValue(n,"morphTargetBaseInfluence",g),c.getUniforms().setValue(n,"morphTargetInfluences",l)}c.getUniforms().setValue(n,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(n,"morphTargetsTextureSize",f.size)}return{update:s}}function ek(n,e,t,i,r){let s=new WeakMap;function o(l){let u=r.render.frame,d=l.geometry,f=e.get(l,d);if(s.get(f)!==u&&(e.update(f),s.set(f,u)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),s.get(l)!==u&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,u))),l.isSkinnedMesh){let h=l.skeleton;s.get(h)!==u&&(h.update(),s.set(h,u))}return f}function a(){s=new WeakMap}function c(l){let u=l.target;u.removeEventListener("dispose",c),i.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:o,dispose:a}}var tk={[zy]:"LINEAR_TONE_MAPPING",[Gy]:"REINHARD_TONE_MAPPING",[jy]:"CINEON_TONE_MAPPING",[Wy]:"ACES_FILMIC_TONE_MAPPING",[qy]:"AGX_TONE_MAPPING",[Xy]:"NEUTRAL_TONE_MAPPING",[$y]:"CUSTOM_TONE_MAPPING"};function nk(n,e,t,i,r,s){let o=new $n(e,t,{type:n,depthBuffer:r,stencilBuffer:s,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),a=null,c=null,l=null,u=new qn;u.setAttribute("position",new It([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute("uv",new It([0,2,0,0,2,0],2));let d=new fh({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new Wt(u,d),h=new Fl(-1,1,1,-1,0,1),g=null,x=null,p=!1,m,S=null,C=[],b=!1;this.setSize=function(T,w){o.setSize(T,w),a!==null&&a.setSize(T,w),c!==null&&c.setSize(T,w);for(let v=0;v<C.length;v++){let E=C[v];E.setSize&&E.setSize(T,w)}},this.setEffects=function(T){C=T,b=C.length>0&&C[0].isRenderPass===!0;let w=o.width,v=o.height;C.length>0&&a===null&&(a=new $n(w,v,{type:Ci,depthBuffer:!1,stencilBuffer:!1}),c=new $n(w,v,{type:Ci,depthBuffer:!1,stencilBuffer:!1}));let E=r===!0&&C.some(O=>O.needsDepthTexture===!0);E!==(o.depthTexture!==null)&&(E===!0&&l===null&&(l=new kr(w,v),s===!0&&(l.format=Br,l.type=So)),o.dispose(),o.depthTexture=E?l:null,o.resolveDepthBuffer=E,o.storeMultisampledDepthBuffer=E);for(let O=0;O<C.length;O++){let R=C[O];R.setSize&&R.setSize(w,v),E&&R.needsDepthTexture===!0&&R.setDepthTexture&&R.setDepthTexture(l)}},this.begin=function(T,w){if(p||T.toneMapping===nr&&C.length===0)return!1;if(S=w,w!==null){let v=w.width,E=w.height;(o.width!==v||o.height!==E)&&this.setSize(v,E)}return b===!1&&T.setRenderTarget(o),m=T.toneMapping,T.toneMapping=nr,!0},this.hasRenderPass=function(){return b},this.end=function(T,w){T.toneMapping=m,p=!0;let v=o,E=a;for(let O=0;O<C.length;O++){let R=C[O];R.enabled!==!1&&(R.render(T,E,v,w),R.needsSwap!==!1&&(v=E,E=E===a?c:a))}if(g!==T.outputColorSpace||x!==T.toneMapping){g=T.outputColorSpace,x=T.toneMapping,d.defines={},ot.getTransfer(g)===gt&&(d.defines.SRGB_TRANSFER="");let O=tk[x];O&&(d.defines[O]=""),d.needsUpdate=!0}d.uniforms.tDiffuse.value=v.texture,T.setRenderTarget(S),T.render(f,h),S=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),c!==null&&c.dispose(),u.dispose(),d.dispose()}}var jw=new Fn,Ww=new kr(1,1),$w=new Dl(1),qw=new Sl,Xw=new oh,Yw=new Tl,Mw=[],bw=[],ww=new Float32Array(16),Cw=new Float32Array(9),Tw=new Float32Array(4);function Ya(n,e,t){let i=n[0];if(i<=0||i>0)return n;let r=e*t,s=Mw[r];if(s===void 0&&(s=new Float32Array(r),Mw[r]=s),e!==0){i.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(s,a)}return s}function Zt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Kt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function yp(n,e){let t=bw[e];t===void 0&&(t=new Int32Array(e),bw[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function ik(n,e){let t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function rk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Zt(t,e))return;n.uniform2fv(this.addr,e),Kt(t,e)}}function sk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Zt(t,e))return;n.uniform3fv(this.addr,e),Kt(t,e)}}function ok(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Zt(t,e))return;n.uniform4fv(this.addr,e),Kt(t,e)}}function ak(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Zt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Kt(t,e)}else{if(Zt(t,i))return;Tw.set(i),n.uniformMatrix2fv(this.addr,!1,Tw),Kt(t,i)}}function ck(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Zt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Kt(t,e)}else{if(Zt(t,i))return;Cw.set(i),n.uniformMatrix3fv(this.addr,!1,Cw),Kt(t,i)}}function lk(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(Zt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Kt(t,e)}else{if(Zt(t,i))return;ww.set(i),n.uniformMatrix4fv(this.addr,!1,ww),Kt(t,i)}}function uk(n,e){let t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function dk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Zt(t,e))return;n.uniform2iv(this.addr,e),Kt(t,e)}}function fk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Zt(t,e))return;n.uniform3iv(this.addr,e),Kt(t,e)}}function hk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Zt(t,e))return;n.uniform4iv(this.addr,e),Kt(t,e)}}function pk(n,e){let t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function mk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Zt(t,e))return;n.uniform2uiv(this.addr,e),Kt(t,e)}}function gk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Zt(t,e))return;n.uniform3uiv(this.addr,e),Kt(t,e)}}function vk(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Zt(t,e))return;n.uniform4uiv(this.addr,e),Kt(t,e)}}function _p(n){return n.version===0&&(n.compareFunction=s_,n.needsUpdate=!0),n}function yk(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?s=_p(Ww):s=jw,t.setTexture2D(e||s,r)}function _k(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Xw,r)}function xk(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_CUBE_SHADOW?s=_p($w):s=Yw,t.setTextureCube(e||s,r)}function Sk(n,e,t){let i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||qw,r)}function Ek(n){switch(n){case 5126:return ik;case 35664:return rk;case 35665:return sk;case 35666:return ok;case 35674:return ak;case 35675:return ck;case 35676:return lk;case 5124:case 35670:return uk;case 35667:case 35671:return dk;case 35668:case 35672:return fk;case 35669:case 35673:return hk;case 5125:return pk;case 36294:return mk;case 36295:return gk;case 36296:return vk;case 35678:case 36198:case 36298:case 36306:case 35682:return yk;case 35679:case 36299:case 36307:return _k;case 35680:case 36300:case 36308:case 36293:return xk;case 36289:case 36303:case 36311:case 36292:return Sk}}function Mk(n,e){n.uniform1fv(this.addr,e)}function bk(n,e){let t=Ya(e,this.size,2);n.uniform2fv(this.addr,t)}function wk(n,e){let t=Ya(e,this.size,3);n.uniform3fv(this.addr,t)}function Ck(n,e){let t=Ya(e,this.size,4);n.uniform4fv(this.addr,t)}function Tk(n,e){let t=Ya(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function Dk(n,e){let t=Ya(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function Ik(n,e){let t=Ya(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function Ak(n,e){n.uniform1iv(this.addr,e)}function Rk(n,e){n.uniform2iv(this.addr,e)}function Nk(n,e){n.uniform3iv(this.addr,e)}function Pk(n,e){n.uniform4iv(this.addr,e)}function Ok(n,e){n.uniform1uiv(this.addr,e)}function Lk(n,e){n.uniform2uiv(this.addr,e)}function Fk(n,e){n.uniform3uiv(this.addr,e)}function kk(n,e){n.uniform4uiv(this.addr,e)}function Uk(n,e,t){let i=this.cache,r=e.length,s=yp(t,r);Zt(i,s)||(n.uniform1iv(this.addr,s),Kt(i,s));let o;this.type===n.SAMPLER_2D_SHADOW?o=_p(Ww):o=jw;for(let a=0;a!==r;++a)t.setTexture2D(e[a]||o,s[a])}function Bk(n,e,t){let i=this.cache,r=e.length,s=yp(t,r);Zt(i,s)||(n.uniform1iv(this.addr,s),Kt(i,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||Xw,s[o])}function Vk(n,e,t){let i=this.cache,r=e.length,s=yp(t,r);Zt(i,s)||(n.uniform1iv(this.addr,s),Kt(i,s));let o;this.type===n.SAMPLER_CUBE_SHADOW?o=_p($w):o=Yw;for(let a=0;a!==r;++a)t.setTextureCube(e[a]||o,s[a])}function Hk(n,e,t){let i=this.cache,r=e.length,s=yp(t,r);Zt(i,s)||(n.uniform1iv(this.addr,s),Kt(i,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||qw,s[o])}function zk(n){switch(n){case 5126:return Mk;case 35664:return bk;case 35665:return wk;case 35666:return Ck;case 35674:return Tk;case 35675:return Dk;case 35676:return Ik;case 5124:case 35670:return Ak;case 35667:case 35671:return Rk;case 35668:case 35672:return Nk;case 35669:case 35673:return Pk;case 5125:return Ok;case 36294:return Lk;case 36295:return Fk;case 36296:return kk;case 35678:case 36198:case 36298:case 36306:case 35682:return Uk;case 35679:case 36299:case 36307:return Bk;case 35680:case 36300:case 36308:case 36293:return Vk;case 36289:case 36303:case 36311:case 36292:return Hk}}var v_=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Ek(t.type)}},y_=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=zk(t.type)}},__=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let r=this.seq;for(let s=0,o=r.length;s!==o;++s){let a=r[s];a.setValue(e,t[a.id],i)}}},m_=/(\w+)(\])?(\[|\.)?/g;function Dw(n,e){n.seq.push(e),n.map[e.id]=e}function Gk(n,e,t){let i=n.name,r=i.length;for(m_.lastIndex=0;;){let s=m_.exec(i),o=m_.lastIndex,a=s[1],c=s[2]==="]",l=s[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===r){Dw(t,l===void 0?new v_(a,n,e):new y_(a,n,e));break}else{let d=t.map[a];d===void 0&&(d=new __(a),Dw(t,d)),t=d}}}var Xa=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<i;++o){let a=e.getActiveUniform(t,o),c=e.getUniformLocation(t,a.name);Gk(a,c,this)}let r=[],s=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(o):s.push(o);r.length>0&&(this.seq=r.concat(s))}setValue(e,t,i,r){let s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){let r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,o=t.length;s!==o;++s){let a=t[s],c=i[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,r)}}static seqWithValue(e,t){let i=[];for(let r=0,s=e.length;r!==s;++r){let o=e[r];o.id in t&&i.push(o)}return i}};function Iw(n,e,t){let i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}var jk=37297,Wk=0;function $k(n,e){let t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){let a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}var Aw=new Ue;function qk(n){ot._getMatrix(Aw,ot.workingColorSpace,n);let e=`mat3( ${Aw.elements.map(t=>t.toFixed(4))} )`;switch(ot.getTransfer(n)){case _l:return[e,"LinearTransferOETF"];case gt:return[e,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function Rw(n,e,t){let i=n.getShaderParameter(e,n.COMPILE_STATUS),s=(n.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";let o=/ERROR: 0:(\d+)/.exec(s);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+$k(n.getShaderSource(e),a)}else return s}function Xk(n,e){let t=qk(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( ${t[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}var Yk={[zy]:"Linear",[Gy]:"Reinhard",[jy]:"Cineon",[Wy]:"ACESFilmic",[qy]:"AgX",[Xy]:"Neutral",[$y]:"Custom"};function Zk(n,e){let t=Yk[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var mp=new L;function Kk(){ot.getLuminanceCoefficients(mp);let n=mp.x.toFixed(4),e=mp.y.toFixed(4),t=mp.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Jk(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Yl).join(`
`)}function Qk(n){let e=[];for(let t in n){let i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function e2(n,e){let t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){let s=n.getActiveAttrib(e,r),o=s.name,a=1;s.type===n.FLOAT_MAT2&&(a=2),s.type===n.FLOAT_MAT3&&(a=3),s.type===n.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function Yl(n){return n!==""}function Nw(n,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,e.numLightProbeGrids)}function Pw(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var t2=/^[ \t]*#include +<([\w\d./]+)>/gm;function x_(n){return n.replace(t2,n2)}function n2(n,e){let t=Qe[e];if(t===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");return x_(t)}var i2=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ow(n){return n.replace(i2,r2)}function r2(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Lw(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var s2={[Vl]:"SHADOWMAP_TYPE_PCF",[za]:"SHADOWMAP_TYPE_VSM"};function o2(n){return s2[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var a2={[ja]:"ENVMAP_MODE_REFRACTION"};function c2(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":a2[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}var l2={[Hy]:"ENVMAP_BLENDING_MULTIPLY",[Kb]:"ENVMAP_BLENDING_MIX",[Jb]:"ENVMAP_BLENDING_ADD"};function u2(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":l2[n.combine]||"ENVMAP_BLENDING_NONE"}function d2(n,e,t,i){let r=n.getContext(),s=t.defines,o=t.vertexShader,a=t.fragmentShader,c=o2(t),l=t.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",u=c2(t),d=u2(t),f=Jk(t),h=Qk(s),g=r.createProgram(),x,p,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,h].filter(Yl).join(`
`),x.length>0&&(x+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,h].filter(Yl).join(`
`),p.length>0&&(p+=`
`)):(x=[Lw(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,h,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+t.diffuseRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Yl).join(`
`),p=[Lw(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,h,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",t.envMapPMREM?"#define ENVMAP_MAX_LOD "+t.envMapMaxLod+".0":"",t.envMapPMREM?"#define ENVMAP_SIZE "+t.envMapSize+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==nr?"#define TONE_MAPPING":"",t.toneMapping!==nr?Qe.tonemapping_pars_fragment:"",t.toneMapping!==nr?Zk("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,Xk("linearToOutputTexel",t.outputColorSpace),Kk(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Yl).join(`
`)),o=x_(o),o=Nw(o,t),o=Pw(o,t),a=x_(a),a=Nw(a,t),a=Pw(a,t),o=Ow(o),a=Ow(a),t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,x=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+x,p=["#define varying in",t.glslVersion===o_?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===o_?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let S=m+x+o,C=m+p+a,b=Iw(r,r.VERTEX_SHADER,S),T=Iw(r,r.FRAGMENT_SHADER,C);r.attachShader(g,b),r.attachShader(g,T),t.index0AttributeName!==void 0?r.bindAttribLocation(g,0,t.index0AttributeName):t.hasPositionAttribute===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function w(R){if(n.debug.checkShaderErrors){let P=r.getProgramInfoLog(g)||"",U=r.getShaderInfoLog(b)||"",G=r.getShaderInfoLog(T)||"",I=P.trim(),z=U.trim(),$=G.trim(),H=!0,te=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(H=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,g,b,T);else{let W=Rw(r,b,"vertex"),J=Rw(r,T,"fragment");Fe("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+I+`
`+W+`
`+J)}else I!==""?Ae("WebGLProgram: Program Info Log:",I):(z===""||$==="")&&(te=!1);te&&(R.diagnostics={runnable:H,programLog:I,vertexShader:{log:z,prefix:x},fragmentShader:{log:$,prefix:p}})}r.deleteShader(b),r.deleteShader(T),v=new Xa(r,g),E=e2(r,g)}let v;this.getUniforms=function(){return v===void 0&&w(this),v};let E;this.getAttributes=function(){return E===void 0&&w(this),E};let O=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return O===!1&&(O=r.getProgramParameter(g,jk)),O},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Wk++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=b,this.fragmentShader=T,this}var f2=0,S_=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(i)===!1&&(r.add(i),i.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new E_(e),t.set(e,i)),i}},E_=class{constructor(e){this.id=f2++,this.code=e,this.usedTimes=0}};function h2(n){return n===Es||n===$l||n===ql}function p2(n,e,t,i,r,s){let o=new Fa,a=new S_,c=new Set,l=[],u=new Map,d=i.logarithmicDepthBuffer,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function h(v){return c.add(v),v===0?"uv":`uv${v}`}function g(v,E,O,R,P,U){let G=R.fog,I=P.geometry,z=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?R.environment:null,$=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,H=e.get(v.envMap||z,$),te=f[v.type],W=i.precision;v.precision!==null&&(W=i.getMaxPrecision(v.precision),W!==v.precision&&Ae("WebGLProgram.getParameters:",v.precision,"not supported, using",W,"instead."));let J=I.morphAttributes.position||I.morphAttributes.normal||I.morphAttributes.color,Q=J!==void 0?J.length:0,Me=0;I.morphAttributes.position!==void 0&&(Me=1),I.morphAttributes.normal!==void 0&&(Me=2),I.morphAttributes.color!==void 0&&(Me=3);let He,Y,ge,xe;if(te){let pe=rr[te];He=pe.vertexShader,Y=pe.fragmentShader}else{He=v.vertexShader,Y=v.fragmentShader;let pe=a.getVertexShaderStage(v),yt=a.getFragmentShaderStage(v);a.update(v,pe,yt),ge=pe.id,xe=yt.id}let Re=n.getRenderTarget(),ve=n.state.buffers.depth.getReversed(),We=P.isInstancedMesh===!0,kt=P.isBatchedMesh===!0,Oe=!!v.map,vt=!!v.matcap,Et=!!H,nt=Et&&H.isPMREMTexture===!0,an=!!v.aoMap,$t=!!v.lightMap,Rn=!!v.bumpMap&&v.wireframe===!1,Rt=!!v.normalMap,Di=!!v.displacementMap,Jt=!!v.emissiveMap,Yn=!!v.metalnessMap,Zn=!!v.roughnessMap,Kn=v.anisotropy>0,N=v.clearcoat>0,Jn=v.diffuseRoughness>0,Tt=v.dispersion>0,Dt=v.retroreflectivity>0,fe=v.iridescence>0,qt=v.sheen>0,Ne=v.transmission>0,Be=Kn&&!!v.anisotropyMap,M=N&&!!v.clearcoatMap,y=N&&!!v.clearcoatNormalMap,k=N&&!!v.clearcoatRoughnessMap,ee=Jn&&!!v.diffuseRoughnessMap,K=fe&&!!v.iridescenceMap,se=fe&&!!v.iridescenceThicknessMap,ue=qt&&!!v.sheenColorMap,q=qt&&!!v.sheenRoughnessMap,X=!!v.specularMap,ae=!!v.specularColorMap,D=!!v.specularIntensityMap,Z=Ne&&!!v.transmissionMap,j=Ne&&!!v.thicknessMap,ce=!!v.gradientMap,ie=!!v.alphaMap,oe=v.alphaTest>0,we=!!v.alphaHash,Ze=!!v.extensions,ne=nr;v.toneMapped&&(Re===null||Re.isXRRenderTarget===!0)&&(ne=n.toneMapping);let Te=nt?H.isCompressedCubeTexture?H.image[0].mipmaps:H.mipmaps:null,Xe={shaderID:te,shaderType:v.type,shaderName:v.name,vertexShader:He,fragmentShader:Y,defines:v.defines,customVertexShaderID:ge,customFragmentShaderID:xe,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:W,batching:kt,batchingColor:kt&&P._colorsTexture!==null,instancing:We,instancingColor:We&&P.instanceColor!==null,instancingMorph:We&&P.morphTexture!==null,outputColorSpace:Re===null?n.outputColorSpace:Re.isXRRenderTarget===!0?Re.texture.colorSpace:ot.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Oe,matcap:vt,envMap:Et,envMapMode:Et&&H.mapping,envMapPMREM:nt,envMapMaxLod:nt?Te.length-1:null,envMapSize:nt?Te[0].width:null,aoMap:an,lightMap:$t,bumpMap:Rn,normalMap:Rt,displacementMap:Di,emissiveMap:Jt,normalMapObjectSpace:Rt&&v.normalMapType===tw,normalMapTangentSpace:Rt&&v.normalMapType===hp,packedNormalMap:Rt&&v.normalMapType===hp&&h2(v.normalMap.format),metalnessMap:Yn,roughnessMap:Zn,anisotropy:Kn,anisotropyMap:Be,clearcoat:N,clearcoatMap:M,clearcoatNormalMap:y,clearcoatRoughnessMap:k,diffuseRoughness:Jn,diffuseRoughnessMap:ee,dispersion:Tt,retroreflection:Dt,iridescence:fe,iridescenceMap:K,iridescenceThicknessMap:se,sheen:qt,sheenColorMap:ue,sheenRoughnessMap:q,specularMap:X,specularColorMap:ae,specularIntensityMap:D,transmission:Ne,transmissionMap:Z,thicknessMap:j,gradientMap:ce,opaque:v.transparent===!1&&v.blending===Ga&&v.alphaToCoverage===!1,alphaMap:ie,alphaTest:oe,alphaHash:we,combine:v.combine,mapUv:Oe&&h(v.map.channel),aoMapUv:an&&h(v.aoMap.channel),lightMapUv:$t&&h(v.lightMap.channel),bumpMapUv:Rn&&h(v.bumpMap.channel),normalMapUv:Rt&&h(v.normalMap.channel),displacementMapUv:Di&&h(v.displacementMap.channel),emissiveMapUv:Jt&&h(v.emissiveMap.channel),metalnessMapUv:Yn&&h(v.metalnessMap.channel),roughnessMapUv:Zn&&h(v.roughnessMap.channel),anisotropyMapUv:Be&&h(v.anisotropyMap.channel),clearcoatMapUv:M&&h(v.clearcoatMap.channel),clearcoatNormalMapUv:y&&h(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:k&&h(v.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:ee&&h(v.diffuseRoughnessMap.channel),iridescenceMapUv:K&&h(v.iridescenceMap.channel),iridescenceThicknessMapUv:se&&h(v.iridescenceThicknessMap.channel),sheenColorMapUv:ue&&h(v.sheenColorMap.channel),sheenRoughnessMapUv:q&&h(v.sheenRoughnessMap.channel),specularMapUv:X&&h(v.specularMap.channel),specularColorMapUv:ae&&h(v.specularColorMap.channel),specularIntensityMapUv:D&&h(v.specularIntensityMap.channel),transmissionMapUv:Z&&h(v.transmissionMap.channel),thicknessMapUv:j&&h(v.thicknessMap.channel),alphaMapUv:ie&&h(v.alphaMap.channel),vertexTangents:!!I.attributes.tangent&&(Rt||Kn),vertexNormals:!!I.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!I.attributes.color&&I.attributes.color.itemSize===4,pointsUvs:P.isPoints===!0&&!!I.attributes.uv&&(Oe||ie),fog:!!G,useFog:v.fog===!0,fogExp2:!!G&&G.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||I.attributes.normal===void 0&&Rt===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ve,skinning:P.isSkinnedMesh===!0,hasPositionAttribute:I.attributes.position!==void 0,morphTargets:I.morphAttributes.position!==void 0,morphNormals:I.morphAttributes.normal!==void 0,morphColors:I.morphAttributes.color!==void 0,morphTargetsCount:Q,morphTextureStride:Me,numSunLights:E.sun.length,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numSunLightShadows:E.sunShadowMap.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:U.filter(pe=>pe.texture!==null).length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:v.dithering,shadowMapEnabled:n.shadowMap.enabled&&O.length>0,shadowMapType:n.shadowMap.type,toneMapping:ne,decodeVideoTexture:Oe&&v.map.isVideoTexture===!0&&ot.getTransfer(v.map.colorSpace)===gt,decodeVideoTextureEmissive:Jt&&v.emissiveMap.isVideoTexture===!0&&ot.getTransfer(v.emissiveMap.colorSpace)===gt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===tr,flipSided:v.side===An,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Ze&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ze&&v.extensions.multiDraw===!0||kt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return Xe.vertexUv1s=c.has(1),Xe.vertexUv2s=c.has(2),Xe.vertexUv3s=c.has(3),c.clear(),Xe}function x(v){let E=[];if(v.shaderID?E.push(v.shaderID):(E.push(v.customVertexShaderID),E.push(v.customFragmentShaderID)),v.defines!==void 0)for(let O in v.defines)E.push(O),E.push(v.defines[O]);return v.isRawShaderMaterial===!1&&(p(E,v),m(E,v),E.push(n.outputColorSpace)),E.push(v.customProgramCacheKey),E.join()}function p(v,E){v.push(E.precision),v.push(E.outputColorSpace),v.push(E.envMapMode),v.push(E.envMapPMREM),v.push(E.envMapMaxLod),v.push(E.envMapSize),v.push(E.mapUv),v.push(E.alphaMapUv),v.push(E.lightMapUv),v.push(E.aoMapUv),v.push(E.bumpMapUv),v.push(E.normalMapUv),v.push(E.displacementMapUv),v.push(E.emissiveMapUv),v.push(E.metalnessMapUv),v.push(E.roughnessMapUv),v.push(E.anisotropyMapUv),v.push(E.clearcoatMapUv),v.push(E.clearcoatNormalMapUv),v.push(E.clearcoatRoughnessMapUv),v.push(E.diffuseRoughnessMapUv),v.push(E.iridescenceMapUv),v.push(E.iridescenceThicknessMapUv),v.push(E.sheenColorMapUv),v.push(E.sheenRoughnessMapUv),v.push(E.specularMapUv),v.push(E.specularColorMapUv),v.push(E.specularIntensityMapUv),v.push(E.transmissionMapUv),v.push(E.thicknessMapUv),v.push(E.combine),v.push(E.fogExp2),v.push(E.sizeAttenuation),v.push(E.morphTargetsCount),v.push(E.numSunLights),v.push(E.numDirLights),v.push(E.numPointLights),v.push(E.numSpotLights),v.push(E.numSpotLightMaps),v.push(E.numHemiLights),v.push(E.numRectAreaLights),v.push(E.numSunLightShadows),v.push(E.numDirLightShadows),v.push(E.numPointLightShadows),v.push(E.numSpotLightShadows),v.push(E.numSpotLightShadowsWithMaps),v.push(E.numLightProbes),v.push(E.numLightProbeGrids),v.push(E.shadowMapType),v.push(E.toneMapping),v.push(E.numClippingPlanes),v.push(E.numClipIntersection),v.push(E.depthPacking)}function m(v,E){o.disableAll(),E.instancing&&o.enable(0),E.instancingColor&&o.enable(1),E.instancingMorph&&o.enable(2),E.matcap&&o.enable(3),E.envMap&&o.enable(4),E.normalMapObjectSpace&&o.enable(5),E.normalMapTangentSpace&&o.enable(6),E.clearcoat&&o.enable(7),E.iridescence&&o.enable(8),E.alphaTest&&o.enable(9),E.vertexColors&&o.enable(10),E.vertexAlphas&&o.enable(11),E.vertexUv1s&&o.enable(12),E.vertexUv2s&&o.enable(13),E.vertexUv3s&&o.enable(14),E.vertexTangents&&o.enable(15),E.anisotropy&&o.enable(16),E.alphaHash&&o.enable(17),E.batching&&o.enable(18),E.dispersion&&o.enable(19),E.retroreflection&&o.enable(24),E.diffuseRoughness&&o.enable(25),E.batchingColor&&o.enable(20),E.gradientMap&&o.enable(21),E.packedNormalMap&&o.enable(22),E.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),E.fog&&o.enable(0),E.useFog&&o.enable(1),E.flatShading&&o.enable(2),E.logarithmicDepthBuffer&&o.enable(3),E.reversedDepthBuffer&&o.enable(4),E.skinning&&o.enable(5),E.morphTargets&&o.enable(6),E.morphNormals&&o.enable(7),E.morphColors&&o.enable(8),E.premultipliedAlpha&&o.enable(9),E.shadowMapEnabled&&o.enable(10),E.doubleSided&&o.enable(11),E.flipSided&&o.enable(12),E.useDepthPacking&&o.enable(13),E.dithering&&o.enable(14),E.transmission&&o.enable(15),E.sheen&&o.enable(16),E.opaque&&o.enable(17),E.pointsUvs&&o.enable(18),E.decodeVideoTexture&&o.enable(19),E.decodeVideoTextureEmissive&&o.enable(20),E.alphaToCoverage&&o.enable(21),E.numLightProbeGrids>0&&o.enable(22),E.hasPositionAttribute&&o.enable(23),v.push(o.mask)}function S(v){let E=f[v.type],O;if(E){let R=rr[E];O=gw.clone(R.uniforms)}else O=v.uniforms;return O}function C(v,E){let O=u.get(E);return O!==void 0?++O.usedTimes:(O=new d2(n,E,v,r),l.push(O),u.set(E,O)),O}function b(v){if(--v.usedTimes===0){let E=l.indexOf(v);l[E]=l[l.length-1],l.pop(),u.delete(v.cacheKey),v.destroy()}}function T(v){a.remove(v)}function w(){a.dispose()}return{getParameters:g,getProgramCacheKey:x,getUniforms:S,acquireProgram:C,releaseProgram:b,releaseShaderCache:T,programs:l,dispose:w}}function m2(){let n=new WeakMap;function e(o){return n.has(o)}function t(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function r(o,a,c){n.get(o)[a]=c}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function g2(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function Fw(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function kw(){let n=[],e=0,t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function o(f){let h=0;return f.isInstancedMesh&&(h+=2),f.isSkinnedMesh&&(h+=1),h}function a(f,h,g,x,p,m){let S=n[e];return S===void 0?(S={id:f.id,object:f,geometry:h,material:g,materialVariant:o(f),groupOrder:x,renderOrder:f.renderOrder,z:p,group:m},n[e]=S):(S.id=f.id,S.object=f,S.geometry=h,S.material=g,S.materialVariant=o(f),S.groupOrder=x,S.renderOrder=f.renderOrder,S.z=p,S.group=m),e++,S}function c(f,h,g,x,p,m,S){S.reversedDepth===!0&&(p=-p);let C=a(f,h,g,x,p,m);g.transmission>0?i.push(C):g.transparent===!0?r.push(C):t.push(C)}function l(f,h,g,x,p,m){let S=a(f,h,g,x,p,m);g.transmission>0?i.unshift(S):g.transparent===!0?r.unshift(S):t.unshift(S)}function u(f,h){t.length>1&&t.sort(f||g2),i.length>1&&i.sort(h||Fw),r.length>1&&r.sort(h||Fw)}function d(){for(let f=e,h=n.length;f<h;f++){let g=n[f];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:c,unshift:l,finish:d,sort:u}}function v2(){let n=new WeakMap;function e(i,r){let s=n.get(i),o;return s===void 0?(o=new kw,n.set(i,[o])):r>=s.length?(o=new kw,s.push(o)):o=s[r],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function y2(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new L,color:new je};break;case"SpotLight":t={position:new L,direction:new L,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new L,halfWidth:new L,halfHeight:new L};break}return n[e.id]=t,t}}}function _2(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}var x2=0;function S2(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function E2(n){let e=new y2,t=_2(),i={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new L);let r=new L,s=new wt,o=new wt;function a(l){let u=0,d=0,f=0;for(let U=0;U<9;U++)i.probe[U].set(0,0,0);let h=0,g=0,x=0,p=0,m=0,S=0,C=0,b=0,T=0,w=0,v=0,E=0,O=0,R=0;l.sort(S2);for(let U=0,G=l.length;U<G;U++){let I=l[U],z=I.color,$=I.intensity,H=I.distance,te=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Es?te=I.shadow.map.texture:te=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)u+=z.r*$,d+=z.g*$,f+=z.b*$;else if(I.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(I.sh.coefficients[W],$);R++}else if(I.isSunLight){let W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,Q=t.get(I);Q.shadowIntensity=J.intensity,Q.shadowBias=J.bias,Q.shadowNormalBias=J.normalBias,Q.shadowRadius=J.radius,Q.shadowMapSize.copy(J.mapSize).multiply(J.getFrameExtents()),i.sunShadow[g]=Q,i.sunShadowMap[g]=te;let Me=J.getViewportCount();for(let He=0;He<Me;He++)i.sunShadowMatrix[x+He]=J.getMatrix(He),i.sunShadowCascade[x+He]=J._cascadeData[He];x+=Me,g++}i.sun[h]=W,h++}else if(I.isDirectionalLight){let W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let J=I.shadow,Q=t.get(I);Q.shadowIntensity=J.intensity,Q.shadowBias=J.bias,Q.shadowNormalBias=J.normalBias,Q.shadowRadius=J.radius,Q.shadowMapSize=J.mapSize,i.directionalShadow[p]=Q,i.directionalShadowMap[p]=te,i.directionalShadowMatrix[p]=I.shadow.matrix,T++}i.directional[p]=W,p++}else if(I.isSpotLight){let W=e.get(I);W.position.setFromMatrixPosition(I.matrixWorld),W.color.copy(z).multiplyScalar($),W.distance=H,W.coneCos=Math.cos(I.angle),W.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),W.decay=I.decay,i.spot[S]=W;let J=I.shadow;if(I.map&&(i.spotLightMap[E]=I.map,E++,J.updateMatrices(I),I.castShadow&&O++),i.spotLightMatrix[S]=J.matrix,I.castShadow){let Q=t.get(I);Q.shadowIntensity=J.intensity,Q.shadowBias=J.bias,Q.shadowNormalBias=J.normalBias,Q.shadowRadius=J.radius,Q.shadowMapSize=J.mapSize,i.spotShadow[S]=Q,i.spotShadowMap[S]=te,v++}S++}else if(I.isRectAreaLight){let W=e.get(I);W.color.copy(z).multiplyScalar($),W.halfWidth.set(I.width*.5,0,0),W.halfHeight.set(0,I.height*.5,0),i.rectArea[C]=W,C++}else if(I.isPointLight){let W=e.get(I);if(W.color.copy(I.color).multiplyScalar(I.intensity),W.distance=I.distance,W.decay=I.decay,I.castShadow){let J=I.shadow,Q=t.get(I);Q.shadowIntensity=J.intensity,Q.shadowBias=J.bias,Q.shadowNormalBias=J.normalBias,Q.shadowRadius=J.radius,Q.shadowMapSize=J.mapSize,Q.shadowCameraNear=J.camera.near,Q.shadowCameraFar=J.camera.far,i.pointShadow[m]=Q,i.pointShadowMap[m]=te,i.pointShadowMatrix[m]=I.shadow.matrix,w++}i.point[m]=W,m++}else if(I.isHemisphereLight){let W=e.get(I);W.skyColor.copy(I.color).multiplyScalar($),W.groundColor.copy(I.groundColor).multiplyScalar($),i.hemi[b]=W,b++}}C>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=me.LTC_FLOAT_1,i.rectAreaLTC2=me.LTC_FLOAT_2):(i.rectAreaLTC1=me.LTC_HALF_1,i.rectAreaLTC2=me.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=f;let P=i.hash;(P.sunLength!==h||P.directionalLength!==p||P.pointLength!==m||P.spotLength!==S||P.rectAreaLength!==C||P.hemiLength!==b||P.numSunShadows!==g||P.numDirectionalShadows!==T||P.numPointShadows!==w||P.numSpotShadows!==v||P.numSpotMaps!==E||P.numLightProbes!==R)&&(i.sun.length=h,i.directional.length=p,i.spot.length=S,i.rectArea.length=C,i.point.length=m,i.hemi.length=b,i.sunShadow.length=g,i.sunShadowMap.length=g,i.sunShadowMatrix.length=x,i.sunShadowCascade.length=x,i.directionalShadow.length=T,i.directionalShadowMap.length=T,i.directionalShadowMatrix.length=T,i.pointShadow.length=w,i.pointShadowMap.length=w,i.pointShadowMatrix.length=w,i.spotShadow.length=v,i.spotShadowMap.length=v,i.spotLightMatrix.length=v+E-O,i.spotLightMap.length=E,i.numSpotLightShadowsWithMaps=O,i.numLightProbes=R,P.sunLength=h,P.directionalLength=p,P.pointLength=m,P.spotLength=S,P.rectAreaLength=C,P.hemiLength=b,P.numSunShadows=g,P.numDirectionalShadows=T,P.numPointShadows=w,P.numSpotShadows=v,P.numSpotMaps=E,P.numLightProbes=R,i.version=x2++)}function c(l,u){let d=0,f=0,h=0,g=0,x=0,p=0,m=u.matrixWorldInverse;for(let S=0,C=l.length;S<C;S++){let b=l[S];if(b.isSunLight){let T=i.sun[d];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),d++}else if(b.isDirectionalLight){let T=i.directional[f];T.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(m),f++}else if(b.isSpotLight){let T=i.spot[g];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(b.matrixWorld),r.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(m),g++}else if(b.isRectAreaLight){let T=i.rectArea[x];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),o.identity(),s.copy(b.matrixWorld),s.premultiply(m),o.extractRotation(s),T.halfWidth.set(b.width*.5,0,0),T.halfHeight.set(0,b.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),x++}else if(b.isPointLight){let T=i.point[h];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(m),h++}else if(b.isHemisphereLight){let T=i.hemi[p];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:c,state:i}}function Uw(n){let e=new E2(n),t=[],i=[],r=[];function s(d){u.camera=d,t.length=0,i.length=0,r.length=0}function o(d){d.isLightProbeGrid?r.push(d):t.push(d)}function a(d){i.push(d)}function c(){e.setup(t),r.sort((d,f)=>d.priority-f.priority||d.id-f.id)}function l(d){e.setupView(t,d)}let u={lightsArray:t,shadowsArray:i,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:a}}function M2(n){let e=new WeakMap;function t(r,s=0){let o=e.get(r),a;return o===void 0?(a=new Uw(n),e.set(r,[a])):s>=o.length?(a=new Uw(n),o.push(a)):a=o[s],a}function i(){e=new WeakMap}return{get:t,dispose:i}}var b2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,w2=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,C2=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],T2=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],Bw=new wt,Xl=new L,g_=new L;function D2(n,e,t){let i=new ms,r=new et,s=new et,o=new At,a=new hh,c=new ph,l={},u=t.maxTextureSize,d={[Ss]:An,[An]:Ss,[tr]:tr},f=new Qi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new et},radius:{value:4}},vertexShader:b2,fragmentShader:w2}),h=f.clone();h.defines.HORIZONTAL_PASS=1;let g=new qn;g.setAttribute("position",new Zi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new Wt(g,f),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Vl;let m=this.type;this.render=function(w,v,E){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===Th&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Vl);let O=n.getRenderTarget(),R=n.getActiveCubeFace(),P=n.getActiveMipmapLevel(),U=n.state;U.setBlending(yo),U.buffers.depth.getReversed()===!0?U.buffers.color.setClear(0,0,0,0):U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);let G=m!==this.type;G&&v.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(z=>z.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,z=w.length;I<z;I++){let $=w[I],H=$.shadow;if(H===void 0){Ae("WebGLShadowMap:",$,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;r.copy(H.mapSize);let te=H.getFrameExtents();r.multiply(te),s.copy(H.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/te.x),r.x=s.x*te.x,H.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/te.y),r.y=s.y*te.y,H.mapSize.y=s.y));let W=n.state.buffers.depth.getReversed();if(H.camera._reversedDepth=W,H.map===null||G===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===za){if($.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new $n(r.x,r.y,{format:Es,type:Ci,minFilter:In,magFilter:In,generateMipmaps:!1}),H.map.texture.name=$.name+".shadowMap",H.map.depthTexture=new kr(r.x,r.y,wi),H.map.depthTexture.name=$.name+".shadowMapDepth",H.map.depthTexture.format=Or,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=on,H.map.depthTexture.magFilter=on}else $.isPointLight?(H.map=new Zl(r.x),H.map.depthTexture=new Dl(r.x,bi)):(H.map=new $n(r.x,r.y),H.map.depthTexture=new kr(r.x,r.y,bi)),H.map.depthTexture.name=$.name+".shadowMap",H.map.depthTexture.format=Or,this.type===Vl?(H.map.depthTexture.compareFunction=W?r_:i_,H.map.depthTexture.minFilter=In,H.map.depthTexture.magFilter=In):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=on,H.map.depthTexture.magFilter=on);H.camera.updateProjectionMatrix()}H.map.isWebGLCubeRenderTarget!==!0&&(H.map.width!==r.x||H.map.height!==r.y)&&H.map.setSize(r.x,r.y);let J=H.map.isWebGLCubeRenderTarget?6:H.getViewportCount();$.isPointLight!==!0&&H.updateMatrices($,E);let Q=(H.camera.layers.mask&4294967294)!==0?H.camera.layers:E.layers;for(let Me=0;Me<J;Me++){let He=H.getCamera(Me);if($.isPointLight){let Y=H.camera,ge=H.matrix,xe=$.distance||Y.far;xe!==Y.far&&(Y.far=xe,Y.updateProjectionMatrix()),Xl.setFromMatrixPosition($.matrixWorld),Y.position.copy(Xl),g_.copy(Y.position),g_.add(C2[Me]),Y.up.copy(T2[Me]),Y.lookAt(g_),Y.updateMatrixWorld(),ge.makeTranslation(-Xl.x,-Xl.y,-Xl.z),Bw.multiplyMatrices(Y.projectionMatrix,Y.matrixWorldInverse),H._frustum.setFromProjectionMatrix(Bw,Y.coordinateSystem,Y.reversedDepth)}if(H.map.isWebGLCubeRenderTarget)n.setRenderTarget(H.map,Me),n.clear();else{Me===0&&(n.setRenderTarget(H.map),n.clear());let Y=H.getViewport(Me);o.set(s.x*Y.x,s.y*Y.y,s.x*Y.z,s.y*Y.w),U.viewport(o)}i=H.getFrustum(Me),b(v,E,He,$,Q,this.type)}H.isPointLightShadow!==!0&&this.type===za&&S(H,E),H.needsUpdate=!1}m=this.type,p.needsUpdate=!1,n.setRenderTarget(O,R,P)};function S(w,v){let E=e.update(x);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,h.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,h.needsUpdate=!0),w.mapPass===null?w.mapPass=new $n(r.x,r.y,{format:Es,type:Ci}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),f.uniforms.shadow_pass.value=w.map.depthTexture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,n.setRenderTarget(w.mapPass),n.clear(),n.renderBufferDirect(v,null,E,f,x,null),h.uniforms.shadow_pass.value=w.mapPass.texture,h.uniforms.resolution.value.set(w.map.width,w.map.height),h.uniforms.radius.value=w.radius,n.setRenderTarget(w.map),n.clear(),n.renderBufferDirect(v,null,E,h,x,null)}function C(w,v,E,O){let R=null,P=E.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(P!==void 0)R=P;else if(R=E.isPointLight===!0?c:a,n.localClippingEnabled&&v.clipShadows===!0&&Array.isArray(v.clippingPlanes)&&v.clippingPlanes.length!==0||v.displacementMap&&v.displacementScale!==0||v.alphaMap&&v.alphaTest>0||v.map&&v.alphaTest>0||v.alphaToCoverage===!0){let U=R.uuid,G=v.uuid,I=l[U];I===void 0&&(I={},l[U]=I);let z=I[G];z===void 0&&(z=R.clone(),I[G]=z,v.addEventListener("dispose",T)),R=z}if(R.visible=v.visible,R.wireframe=v.wireframe,O===za?R.side=v.shadowSide!==null?v.shadowSide:v.side:R.side=v.shadowSide!==null?v.shadowSide:d[v.side],R.alphaMap=v.alphaMap,R.alphaTest=v.alphaToCoverage===!0?.5:v.alphaTest,R.map=v.map,R.clipShadows=v.clipShadows,R.clippingPlanes=v.clippingPlanes,R.clipIntersection=v.clipIntersection,R.displacementMap=v.displacementMap,R.displacementScale=v.displacementScale,R.displacementBias=v.displacementBias,R.wireframeLinewidth=v.wireframeLinewidth,R.linewidth=v.linewidth,E.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let U=n.properties.get(R);U.light=E}return R}function b(w,v,E,O,R,P){if(w.visible===!1)return;if(w.layers.test(R)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&P===za)&&(!w.frustumCulled||w.intersectsFrustum(i))){w.modelViewMatrix.multiplyMatrices(E.matrixWorldInverse,w.matrixWorld);let I=e.update(w),z=w.material;if(Array.isArray(z)){let $=I.groups;for(let H=0,te=$.length;H<te;H++){let W=$[H],J=z[W.materialIndex];if(J&&J.visible){let Q=C(w,J,O,P);w.onBeforeShadow(n,w,v,E,I,Q,W),n.renderBufferDirect(E,null,I,Q,w,W),w.onAfterShadow(n,w,v,E,I,Q,W)}}}else if(z.visible){let $=C(w,z,O,P);w.onBeforeShadow(n,w,v,E,I,$,null),n.renderBufferDirect(E,null,I,$,w,null),w.onAfterShadow(n,w,v,E,I,$,null)}}let G=w.children;for(let I=0,z=G.length;I<z;I++)b(G[I],v,E,O,R,P)}function T(w){w.target.removeEventListener("dispose",T);for(let E in l){let O=l[E],R=w.target.uuid;R in O&&(O[R].dispose(),delete O[R])}}}function I2(n,e){function t(){let D=!1,Z=new At,j=null,ce=new At(0,0,0,0);return{setMask:function(ie){j!==ie&&!D&&(n.colorMask(ie,ie,ie,ie),j=ie)},setLocked:function(ie){D=ie},setClear:function(ie,oe,we,Ze,ne){ne===!0&&(ie*=Ze,oe*=Ze,we*=Ze),Z.set(ie,oe,we,Ze),ce.equals(Z)===!1&&(n.clearColor(ie,oe,we,Ze),ce.copy(Z))},reset:function(){D=!1,j=null,ce.set(-1,0,0,0)}}}function i(){let D=!1,Z=!1,j=null,ce=null,ie=null;return{setReversed:function(oe){if(Z!==oe){let we=e.get("EXT_clip_control");oe?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),Z=oe;let Ze=ie;ie=null,this.setClear(Ze)}},getReversed:function(){return Z},setTest:function(oe){oe?ve(n.DEPTH_TEST):We(n.DEPTH_TEST)},setMask:function(oe){j!==oe&&!D&&(n.depthMask(oe),j=oe)},setFunc:function(oe){if(Z&&(oe=fw[oe]),ce!==oe){switch(oe){case Xf:n.depthFunc(n.NEVER);break;case Yf:n.depthFunc(n.ALWAYS);break;case Zf:n.depthFunc(n.LESS);break;case Ra:n.depthFunc(n.LEQUAL);break;case Kf:n.depthFunc(n.EQUAL);break;case Jf:n.depthFunc(n.GEQUAL);break;case Qf:n.depthFunc(n.GREATER);break;case eh:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}ce=oe}},setLocked:function(oe){D=oe},setClear:function(oe){ie!==oe&&(ie=oe,Z&&(oe=1-oe),n.clearDepth(oe))},reset:function(){D=!1,j=null,ce=null,ie=null,Z=!1}}}function r(){let D=!1,Z=null,j=null,ce=null,ie=null,oe=null,we=null,Ze=null,ne=null;return{setTest:function(Te){D||(Te?ve(n.STENCIL_TEST):We(n.STENCIL_TEST))},setMask:function(Te){Z!==Te&&!D&&(n.stencilMask(Te),Z=Te)},setFunc:function(Te,Xe,pe){(j!==Te||ce!==Xe||ie!==pe)&&(n.stencilFunc(Te,Xe,pe),j=Te,ce=Xe,ie=pe)},setOp:function(Te,Xe,pe){(oe!==Te||we!==Xe||Ze!==pe)&&(n.stencilOp(Te,Xe,pe),oe=Te,we=Xe,Ze=pe)},setLocked:function(Te){D=Te},setClear:function(Te){ne!==Te&&(n.clearStencil(Te),ne=Te)},reset:function(){D=!1,Z=null,j=null,ce=null,ie=null,oe=null,we=null,Ze=null,ne=null}}}let s=new t,o=new i,a=new r,c={},l=new WeakMap,u={},d={},f={},h=new WeakMap,g=[],x=null,p=!1,m=null,S=null,C=null,b=null,T=null,w=null,v=null,E=new je(0,0,0),O=0,R=!1,P=null,U=null,G=null,I=null,z=null,$=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),H=!1,te=0,W=n.getParameter(n.VERSION);W.indexOf("WebGL")!==-1?(te=parseFloat(/^WebGL (\d)/.exec(W)[1]),H=te>=1):W.indexOf("OpenGL ES")!==-1&&(te=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),H=te>=2);let J=null,Q={},Me=n.getParameter(n.SCISSOR_BOX),He=n.getParameter(n.VIEWPORT),Y=new At().fromArray(Me),ge=new At().fromArray(He);function xe(D,Z,j,ce){let ie=new Uint8Array(4),oe=n.createTexture();n.bindTexture(D,oe),n.texParameteri(D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(D,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let we=0;we<j;we++)D===n.TEXTURE_3D||D===n.TEXTURE_2D_ARRAY?n.texImage3D(Z,0,n.RGBA,1,1,ce,0,n.RGBA,n.UNSIGNED_BYTE,ie):n.texImage2D(Z+we,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,ie);return oe}let Re={};Re[n.TEXTURE_2D]=xe(n.TEXTURE_2D,n.TEXTURE_2D,1),Re[n.TEXTURE_CUBE_MAP]=xe(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),Re[n.TEXTURE_2D_ARRAY]=xe(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Re[n.TEXTURE_3D]=xe(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ve(n.DEPTH_TEST),o.setFunc(Ra),Rn(!1),Rt(Ly),ve(n.CULL_FACE),an(yo);function ve(D){u[D]!==!0&&(n.enable(D),u[D]=!0)}function We(D){u[D]!==!1&&(n.disable(D),u[D]=!1)}function kt(D,Z){return f[D]!==Z?(n.bindFramebuffer(D,Z),f[D]=Z,D===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=Z),D===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=Z),!0):!1}function Oe(D,Z){let j=g,ce=!1;if(D){j=h.get(Z),j===void 0&&(j=[],h.set(Z,j));let ie=D.textures;if(j.length!==ie.length||j[0]!==n.COLOR_ATTACHMENT0){for(let oe=0,we=ie.length;oe<we;oe++)j[oe]=n.COLOR_ATTACHMENT0+oe;j.length=ie.length,ce=!0}}else j[0]!==n.BACK&&(j[0]=n.BACK,ce=!0);ce&&n.drawBuffers(j)}function vt(D){return x!==D?(n.useProgram(D),x=D,!0):!1}let Et={[_o]:n.FUNC_ADD,[Ob]:n.FUNC_SUBTRACT,[Lb]:n.FUNC_REVERSE_SUBTRACT};Et[Fb]=n.MIN,Et[kb]=n.MAX;let nt={[Ub]:n.ZERO,[Bb]:n.ONE,[Vb]:n.SRC_COLOR,[By]:n.SRC_ALPHA,[$b]:n.SRC_ALPHA_SATURATE,[jb]:n.DST_COLOR,[zb]:n.DST_ALPHA,[Hb]:n.ONE_MINUS_SRC_COLOR,[Vy]:n.ONE_MINUS_SRC_ALPHA,[Wb]:n.ONE_MINUS_DST_COLOR,[Gb]:n.ONE_MINUS_DST_ALPHA,[qb]:n.CONSTANT_COLOR,[Xb]:n.ONE_MINUS_CONSTANT_COLOR,[Yb]:n.CONSTANT_ALPHA,[Zb]:n.ONE_MINUS_CONSTANT_ALPHA};function an(D,Z,j,ce,ie,oe,we,Ze,ne,Te){if(D===yo){p===!0&&(We(n.BLEND),p=!1);return}if(p===!1&&(ve(n.BLEND),p=!0),D!==Pb){if(D!==m||Te!==R){if((S!==_o||T!==_o)&&(n.blendEquation(n.FUNC_ADD),S=_o,T=_o),Te)switch(D){case Ga:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Fy:n.blendFunc(n.ONE,n.ONE);break;case ky:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Uy:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Fe("WebGLState: Invalid blending: ",D);break}else switch(D){case Ga:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Fy:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case ky:Fe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Uy:Fe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Fe("WebGLState: Invalid blending: ",D);break}C=null,b=null,w=null,v=null,E.set(0,0,0),O=0,m=D,R=Te}return}ie=ie||Z,oe=oe||j,we=we||ce,(Z!==S||ie!==T)&&(n.blendEquationSeparate(Et[Z],Et[ie]),S=Z,T=ie),(j!==C||ce!==b||oe!==w||we!==v)&&(n.blendFuncSeparate(nt[j],nt[ce],nt[oe],nt[we]),C=j,b=ce,w=oe,v=we),(Ze.equals(E)===!1||ne!==O)&&(n.blendColor(Ze.r,Ze.g,Ze.b,ne),E.copy(Ze),O=ne),m=D,R=!1}function $t(D,Z){D.side===tr?We(n.CULL_FACE):ve(n.CULL_FACE);let j=D.side===An;Z&&(j=!j),Rn(j),D.blending===Ga&&D.transparent===!1?an(yo):an(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),o.setFunc(D.depthFunc),o.setTest(D.depthTest),o.setMask(D.depthWrite),s.setMask(D.colorWrite);let ce=D.stencilWrite;a.setTest(ce),ce&&(a.setMask(D.stencilWriteMask),a.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),a.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),Jt(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?ve(n.SAMPLE_ALPHA_TO_COVERAGE):We(n.SAMPLE_ALPHA_TO_COVERAGE)}function Rn(D){P!==D&&(D?n.frontFace(n.CW):n.frontFace(n.CCW),P=D)}function Rt(D){D!==Rb?(ve(n.CULL_FACE),D!==U&&(D===Ly?n.cullFace(n.BACK):D===Nb?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):We(n.CULL_FACE),U=D}function Di(D){D!==G&&(H&&n.lineWidth(D),G=D)}function Jt(D,Z,j){D?(ve(n.POLYGON_OFFSET_FILL),(I!==Z||z!==j)&&(I=Z,z=j,o.getReversed()&&(Z=-Z,j=-j),n.polygonOffset(Z,j))):We(n.POLYGON_OFFSET_FILL)}function Yn(D){D?ve(n.SCISSOR_TEST):We(n.SCISSOR_TEST)}function Zn(D){D===void 0&&(D=n.TEXTURE0+$-1),J!==D&&(n.activeTexture(D),J=D)}function Kn(D,Z,j){j===void 0&&(J===null?j=n.TEXTURE0+$-1:j=J);let ce=Q[j];ce===void 0&&(ce={type:void 0,texture:void 0},Q[j]=ce),(ce.type!==D||ce.texture!==Z)&&(J!==j&&(n.activeTexture(j),J=j),n.bindTexture(D,Z||Re[D]),ce.type=D,ce.texture=Z)}function N(){let D=Q[J];D!==void 0&&D.type!==void 0&&(n.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function Jn(){try{n.compressedTexImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function Tt(){try{n.compressedTexImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function Dt(){try{n.texSubImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function fe(){try{n.texSubImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function qt(){try{n.compressedTexSubImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function Ne(){try{n.compressedTexSubImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function Be(){try{n.texStorage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function M(){try{n.texStorage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function y(){try{n.texImage2D(...arguments)}catch(D){Fe("WebGLState:",D)}}function k(){try{n.texImage3D(...arguments)}catch(D){Fe("WebGLState:",D)}}function ee(D){return d[D]!==void 0?d[D]:n.getParameter(D)}function K(D,Z){d[D]!==Z&&(n.pixelStorei(D,Z),d[D]=Z)}function se(D){Y.equals(D)===!1&&(n.scissor(D.x,D.y,D.z,D.w),Y.copy(D))}function ue(D){ge.equals(D)===!1&&(n.viewport(D.x,D.y,D.z,D.w),ge.copy(D))}function q(D,Z){let j=l.get(Z);j===void 0&&(j=new WeakMap,l.set(Z,j));let ce=j.get(D);ce===void 0&&(ce=n.getUniformBlockIndex(Z,D.name),n.uniformBlockBinding(Z,ce,ce),j.set(D,ce))}function X(D,Z,j){let ie=l.get(Z).get(D);c[ie]!==j&&(n.bindBufferBase(n.UNIFORM_BUFFER,ie,j),c[ie]=j)}function ae(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),u={},d={},J=null,Q={},f={},c={},h=new WeakMap,g=[],x=null,p=!1,m=null,S=null,C=null,b=null,T=null,w=null,v=null,E=new je(0,0,0),O=0,R=!1,P=null,U=null,G=null,I=null,z=null,Y.set(0,0,n.canvas.width,n.canvas.height),ge.set(0,0,n.canvas.width,n.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:ve,disable:We,bindFramebuffer:kt,drawBuffers:Oe,useProgram:vt,setBlending:an,setMaterial:$t,setFlipSided:Rn,setCullFace:Rt,setLineWidth:Di,setPolygonOffset:Jt,setScissorTest:Yn,activeTexture:Zn,bindTexture:Kn,unbindTexture:N,compressedTexImage2D:Jn,compressedTexImage3D:Tt,texImage2D:y,texImage3D:k,pixelStorei:K,getParameter:ee,updateUBOMapping:q,uniformBlockBinding:X,texStorage2D:Be,texStorage3D:M,texSubImage2D:Dt,texSubImage3D:fe,compressedTexSubImage2D:qt,compressedTexSubImage3D:Ne,scissor:se,viewport:ue,reset:ae}}function A2(n,e,t,i,r,s,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new et,u=new WeakMap,d=new Set,f,h=new WeakMap,g=new Set,x=new FinalizationRegistry(M=>g.delete(M)),p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(M,y){return p?new OffscreenCanvas(M,y):xl("canvas")}function S(M,y,k){let ee=1,K=Be(M);if((K.width>k||K.height>k)&&(ee=k/Math.max(K.width,K.height)),ee<1)if(typeof HTMLImageElement<"u"&&M instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&M instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&M instanceof ImageBitmap||typeof VideoFrame<"u"&&M instanceof VideoFrame){let se=Math.floor(ee*K.width),ue=Math.floor(ee*K.height);f===void 0&&(f=m(se,ue));let q=y?m(se,ue):f;return q.width=se,q.height=ue,q.getContext("2d").drawImage(M,0,0,se,ue),Ae("WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+se+"x"+ue+")."),q}else return"data"in M&&Ae("WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),M;return M}function C(M){return M.generateMipmaps}function b(M){n.generateMipmap(M)}function T(M){return M.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:M.isWebGL3DRenderTarget?n.TEXTURE_3D:M.isWebGLArrayRenderTarget||M.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function w(M,y,k,ee,K,se=!1){if(M!==null){if(n[M]!==void 0)return n[M];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+M+"'")}let ue;ee&&(ue=e.get("EXT_texture_norm16"),ue||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let q=y;if(y===n.RED&&(k===n.FLOAT&&(q=n.R32F),k===n.HALF_FLOAT&&(q=n.R16F),k===n.UNSIGNED_BYTE&&(q=n.R8),k===n.UNSIGNED_SHORT&&ue&&(q=ue.R16_EXT),k===n.SHORT&&ue&&(q=ue.R16_SNORM_EXT)),y===n.RED_INTEGER&&(k===n.UNSIGNED_BYTE&&(q=n.R8UI),k===n.UNSIGNED_SHORT&&(q=n.R16UI),k===n.UNSIGNED_INT&&(q=n.R32UI),k===n.BYTE&&(q=n.R8I),k===n.SHORT&&(q=n.R16I),k===n.INT&&(q=n.R32I)),y===n.RG&&(k===n.FLOAT&&(q=n.RG32F),k===n.HALF_FLOAT&&(q=n.RG16F),k===n.UNSIGNED_BYTE&&(q=n.RG8),k===n.UNSIGNED_SHORT&&ue&&(q=ue.RG16_EXT),k===n.SHORT&&ue&&(q=ue.RG16_SNORM_EXT)),y===n.RG_INTEGER&&(k===n.UNSIGNED_BYTE&&(q=n.RG8UI),k===n.UNSIGNED_SHORT&&(q=n.RG16UI),k===n.UNSIGNED_INT&&(q=n.RG32UI),k===n.BYTE&&(q=n.RG8I),k===n.SHORT&&(q=n.RG16I),k===n.INT&&(q=n.RG32I)),y===n.RGB_INTEGER&&(k===n.UNSIGNED_BYTE&&(q=n.RGB8UI),k===n.UNSIGNED_SHORT&&(q=n.RGB16UI),k===n.UNSIGNED_INT&&(q=n.RGB32UI),k===n.BYTE&&(q=n.RGB8I),k===n.SHORT&&(q=n.RGB16I),k===n.INT&&(q=n.RGB32I)),y===n.RGBA_INTEGER&&(k===n.UNSIGNED_BYTE&&(q=n.RGBA8UI),k===n.UNSIGNED_SHORT&&(q=n.RGBA16UI),k===n.UNSIGNED_INT&&(q=n.RGBA32UI),k===n.BYTE&&(q=n.RGBA8I),k===n.SHORT&&(q=n.RGBA16I),k===n.INT&&(q=n.RGBA32I)),y===n.RGB&&(k===n.UNSIGNED_SHORT&&ue&&(q=ue.RGB16_EXT),k===n.SHORT&&ue&&(q=ue.RGB16_SNORM_EXT),k===n.UNSIGNED_INT_5_9_9_9_REV&&(q=n.RGB9_E5),k===n.UNSIGNED_INT_10F_11F_11F_REV&&(q=n.R11F_G11F_B10F)),y===n.RGBA){let X=se?_l:ot.getTransfer(K);k===n.FLOAT&&(q=n.RGBA32F),k===n.HALF_FLOAT&&(q=n.RGBA16F),k===n.UNSIGNED_BYTE&&(q=X===gt?n.SRGB8_ALPHA8:n.RGBA8),k===n.UNSIGNED_SHORT&&ue&&(q=ue.RGBA16_EXT),k===n.SHORT&&ue&&(q=ue.RGBA16_SNORM_EXT),k===n.UNSIGNED_SHORT_4_4_4_4&&(q=n.RGBA4),k===n.UNSIGNED_SHORT_5_5_5_1&&(q=n.RGB5_A1)}return(q===n.R16F||q===n.R32F||q===n.RG16F||q===n.RG32F||q===n.RGBA16F||q===n.RGBA32F)&&e.get("EXT_color_buffer_float"),q}function v(M,y){let k;return M?y===null||y===bi||y===So?k=n.DEPTH24_STENCIL8:y===wi?k=n.DEPTH32F_STENCIL8:y===Wa&&(k=n.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===bi||y===So?k=n.DEPTH_COMPONENT24:y===wi?k=n.DEPTH_COMPONENT32F:y===Wa&&(k=n.DEPTH_COMPONENT16),k}function E(M,y){return C(M)===!0||M.isFramebufferTexture&&M.minFilter!==on&&M.minFilter!==In?Math.log2(Math.max(y.width,y.height))+1:M.mipmaps.length>0?M.mipmaps.length:M.isCompressedTexture&&Array.isArray(M.image)?y.mipmaps.length:1}function O(M){let y=new WeakRef(M);i.get(M).__ref=y,g.add(y),x.register(M,y,y)}function R(M){let y=i.get(M).__ref;y!==void 0&&(g.delete(y),x.unregister(y))}function P(M){G(M.target)}function U(M){I(M.target)}function G(M){M.removeEventListener("dispose",P),R(M),$(M),M.isVideoTexture&&u.delete(M),M.isHTMLTexture&&d.delete(M)}function I(M){M.removeEventListener("dispose",U),R(M),te(M)}function z(){for(let M of g){let y=M.deref();y!==void 0&&(y.isRenderTarget===!0?I(y):G(y))}g.clear(),d.clear()}function $(M){let y=i.get(M);if(y.__webglInit===void 0)return;let k=M.source,ee=h.get(k);if(ee){let K=ee[y.__cacheKey];K.usedTimes--,K.usedTimes===0&&H(M),Object.keys(ee).length===0&&h.delete(k)}i.remove(M)}function H(M){let y=i.get(M);n.deleteTexture(y.__webglTexture);let k=M.source,ee=h.get(k);delete ee[y.__cacheKey],o.memory.textures--}function te(M){let y=i.get(M);y.__depthDisposeCallback&&y.__depthDisposeCallback();let k=M.depthTexture;if(k&&k.renderTarget===M&&G(k),M.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(y.__webglFramebuffer[K]))for(let se=0;se<y.__webglFramebuffer[K].length;se++)n.deleteFramebuffer(y.__webglFramebuffer[K][se]);else n.deleteFramebuffer(y.__webglFramebuffer[K]);y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer[K])}else{if(Array.isArray(y.__webglFramebuffer))for(let K=0;K<y.__webglFramebuffer.length;K++)n.deleteFramebuffer(y.__webglFramebuffer[K]);else n.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&n.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let K=0;K<y.__webglColorRenderbuffer.length;K++)y.__webglColorRenderbuffer[K]&&n.deleteRenderbuffer(y.__webglColorRenderbuffer[K]);y.__webglDepthRenderbuffer&&n.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let ee=M.textures;for(let K=0,se=ee.length;K<se;K++){let ue=i.get(ee[K]);ue.__webglTexture&&(n.deleteTexture(ue.__webglTexture),o.memory.textures--),i.remove(ee[K])}i.remove(M)}let W=0;function J(){W=0}function Q(){return W}function Me(M){W=M}function He(){let M=W;return M>=r.maxTextures&&Ae("WebGLTextures: Trying to use "+(M+1)+" texture units while this GPU supports only "+r.maxTextures),W+=1,M}function Y(M){let y=[];return y.push(M.wrapS),y.push(M.wrapT),y.push(M.wrapR||0),y.push(M.magFilter),y.push(M.minFilter),y.push(M.anisotropy),y.push(M.internalFormat),y.push(M.format),y.push(M.type),y.push(M.generateMipmaps),y.push(M.mipmapsAutoUpdate),y.push(M.premultiplyAlpha),y.push(M.flipY),y.push(M.unpackAlignment),y.push(M.colorSpace),y.join()}function ge(M,y){let k=i.get(M);if(M.isVideoTexture&&qt(M),M.isRenderTargetTexture===!1&&M.isExternalTexture!==!0&&M.version>0&&k.__version!==M.version){let ee=M.image;if(ee===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)Ae("WebGLRenderer: Texture marked for update but image is incomplete");else{$t(k,M,y);return}}else M.isExternalTexture&&(k.__webglTexture=M.sourceTexture?M.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,k.__webglTexture,n.TEXTURE0+y)}function xe(M,y){let k=i.get(M);if(M.isRenderTargetTexture===!1&&M.version>0&&k.__version!==M.version){$t(k,M,y);return}else M.isExternalTexture&&(k.__webglTexture=M.sourceTexture?M.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,k.__webglTexture,n.TEXTURE0+y)}function Re(M,y){let k=i.get(M);if(M.isRenderTargetTexture===!1&&M.version>0&&k.__version!==M.version){$t(k,M,y);return}t.bindTexture(n.TEXTURE_3D,k.__webglTexture,n.TEXTURE0+y)}function ve(M,y){let k=i.get(M);if(M.version>0&&k.__version!==M.version){Rn(k,M,y);return}t.bindTexture(n.TEXTURE_CUBE_MAP,k.__webglTexture,n.TEXTURE0+y)}let We={[th]:n.REPEAT,[Yi]:n.CLAMP_TO_EDGE,[nh]:n.MIRRORED_REPEAT},kt={[on]:n.NEAREST,[Qb]:n.NEAREST_MIPMAP_NEAREST,[Hl]:n.NEAREST_MIPMAP_LINEAR,[In]:n.LINEAR,[Ah]:n.LINEAR_MIPMAP_NEAREST,[Ur]:n.LINEAR_MIPMAP_LINEAR},Oe={[iw]:n.NEVER,[s_]:n.ALWAYS,[rw]:n.LESS,[i_]:n.LEQUAL,[sw]:n.EQUAL,[r_]:n.GEQUAL,[ow]:n.GREATER,[aw]:n.NOTEQUAL};function vt(M,y){if(y.type===wi&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===In||y.magFilter===Ah||y.magFilter===Hl||y.magFilter===Ur||y.minFilter===In||y.minFilter===Ah||y.minFilter===Hl||y.minFilter===Ur)&&Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(M,n.TEXTURE_WRAP_S,We[y.wrapS]),n.texParameteri(M,n.TEXTURE_WRAP_T,We[y.wrapT]),(M===n.TEXTURE_3D||M===n.TEXTURE_2D_ARRAY)&&n.texParameteri(M,n.TEXTURE_WRAP_R,We[y.wrapR]),n.texParameteri(M,n.TEXTURE_MAG_FILTER,kt[y.magFilter]),n.texParameteri(M,n.TEXTURE_MIN_FILTER,kt[y.minFilter]),y.compareFunction&&(n.texParameteri(M,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(M,n.TEXTURE_COMPARE_FUNC,Oe[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===on||y.minFilter!==Hl&&y.minFilter!==Ur||y.type===wi&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){let k=e.get("EXT_texture_filter_anisotropic");n.texParameterf(M,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,r.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function Et(M,y){let k=!1;M.__webglInit===void 0&&(M.__webglInit=!0,y.addEventListener("dispose",P),O(y));let ee=y.source,K=h.get(ee);K===void 0&&(K={},h.set(ee,K));let se=Y(y);if(se!==M.__cacheKey){K[se]===void 0&&(K[se]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,k=!0),K[se].usedTimes++;let ue=K[M.__cacheKey];ue!==void 0&&(K[M.__cacheKey].usedTimes--,ue.usedTimes===0&&H(y)),M.__cacheKey=se,M.__webglTexture=K[se].texture}return k}function nt(M,y,k){return Math.floor(Math.floor(M/k)/y)}function an(M,y,k,ee){let se=M.updateRanges;if(se.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,y.width,y.height,k,ee,y.data);else{se.sort((D,Z)=>D.start-Z.start);let ue=0;for(let D=1;D<se.length;D++){let Z=se[ue],j=se[D],ce=Z.start+Z.count,ie=nt(j.start,y.width,4),oe=nt(Z.start,y.width,4);j.start<=ce+1&&ie===oe&&nt(j.start+j.count-1,y.width,4)===ie?Z.count=Math.max(Z.count,j.start+j.count-Z.start):(++ue,se[ue]=j)}se.length=ue+1;let q=t.getParameter(n.UNPACK_ROW_LENGTH),X=t.getParameter(n.UNPACK_SKIP_PIXELS),ae=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,y.width);for(let D=0,Z=se.length;D<Z;D++){let j=se[D],ce=Math.floor(j.start/4),ie=Math.ceil(j.count/4),oe=ce%y.width,we=Math.floor(ce/y.width),Ze=ie,ne=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,oe),t.pixelStorei(n.UNPACK_SKIP_ROWS,we),t.texSubImage2D(n.TEXTURE_2D,0,oe,we,Ze,ne,k,ee,y.data)}M.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,q),t.pixelStorei(n.UNPACK_SKIP_PIXELS,X),t.pixelStorei(n.UNPACK_SKIP_ROWS,ae)}}function $t(M,y,k){let ee=n.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(ee=n.TEXTURE_2D_ARRAY),y.isData3DTexture&&(ee=n.TEXTURE_3D);let K=Et(M,y),se=y.source;t.bindTexture(ee,M.__webglTexture,n.TEXTURE0+k);let ue=i.get(se);if(se.version!==ue.__version||K===!0){if(t.activeTexture(n.TEXTURE0+k),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let ne=ot.getPrimaries(ot.workingColorSpace),Te=y.colorSpace===Vr?null:ot.getPrimaries(y.colorSpace),Xe=y.colorSpace===Vr||ne===Te?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Xe)}t.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment);let X=S(y.image,!1,r.maxTextureSize);X=Ne(y,X);let ae=s.convert(y.format,y.colorSpace),D=s.convert(y.type),Z=w(y.internalFormat,ae,D,y.normalized,y.colorSpace,y.isVideoTexture);vt(ee,y);let j,ce=y.mipmaps,ie=y.isVideoTexture!==!0,oe=ue.__version===void 0||K===!0,we=se.dataReady,Ze=E(y,X);if(y.isDepthTexture)Z=v(y.format===Br,y.type),oe&&(ie?t.texStorage2D(n.TEXTURE_2D,1,Z,X.width,X.height):t.texImage2D(n.TEXTURE_2D,0,Z,X.width,X.height,0,ae,D,null));else if(y.isDataTexture)if(ce.length>0){ie&&oe&&t.texStorage2D(n.TEXTURE_2D,Ze,Z,ce[0].width,ce[0].height);for(let ne=0,Te=ce.length;ne<Te;ne++)j=ce[ne],ie?we&&t.texSubImage2D(n.TEXTURE_2D,ne,0,0,j.width,j.height,ae,D,j.data):t.texImage2D(n.TEXTURE_2D,ne,Z,j.width,j.height,0,ae,D,j.data);y.generateMipmaps=!1}else ie?(oe&&t.texStorage2D(n.TEXTURE_2D,Ze,Z,X.width,X.height),we&&an(y,X,ae,D)):t.texImage2D(n.TEXTURE_2D,0,Z,X.width,X.height,0,ae,D,X.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){ie&&oe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ze,Z,ce[0].width,ce[0].height,X.depth);for(let ne=0,Te=ce.length;ne<Te;ne++)if(j=ce[ne],y.format!==Ti)if(ae!==null)if(ie){if(we)if(y.layerUpdates.size>0){let Xe=p_(j.width,j.height,y.format,y.type);for(let pe of y.layerUpdates){let yt=j.data.subarray(pe*Xe/j.data.BYTES_PER_ELEMENT,(pe+1)*Xe/j.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ne,0,0,pe,j.width,j.height,1,ae,yt)}}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ne,0,0,0,j.width,j.height,X.depth,ae,j.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ne,Z,j.width,j.height,X.depth,0,j.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ie?we&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ne,0,0,0,j.width,j.height,X.depth,ae,D,j.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ne,Z,j.width,j.height,X.depth,0,ae,D,j.data);y.layerUpdates.size>0&&y.clearLayerUpdates()}else{ie&&oe&&t.texStorage2D(n.TEXTURE_2D,Ze,Z,ce[0].width,ce[0].height);for(let ne=0,Te=ce.length;ne<Te;ne++)j=ce[ne],y.format!==Ti?ae!==null?ie?we&&t.compressedTexSubImage2D(n.TEXTURE_2D,ne,0,0,j.width,j.height,ae,j.data):t.compressedTexImage2D(n.TEXTURE_2D,ne,Z,j.width,j.height,0,j.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ie?we&&t.texSubImage2D(n.TEXTURE_2D,ne,0,0,j.width,j.height,ae,D,j.data):t.texImage2D(n.TEXTURE_2D,ne,Z,j.width,j.height,0,ae,D,j.data)}else if(y.isDataArrayTexture)if(ie){if(oe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ze,Z,X.width,X.height,X.depth),we)if(y.layerUpdates.size>0){let ne=p_(X.width,X.height,y.format,y.type);for(let Te of y.layerUpdates){let Xe=X.data.subarray(Te*ne/X.data.BYTES_PER_ELEMENT,(Te+1)*ne/X.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Te,X.width,X.height,1,ae,D,Xe)}y.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,X.width,X.height,X.depth,ae,D,X.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Z,X.width,X.height,X.depth,0,ae,D,X.data);else if(y.isData3DTexture)ie?(oe&&t.texStorage3D(n.TEXTURE_3D,Ze,Z,X.width,X.height,X.depth),we&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,X.width,X.height,X.depth,ae,D,X.data)):t.texImage3D(n.TEXTURE_3D,0,Z,X.width,X.height,X.depth,0,ae,D,X.data);else if(y.isFramebufferTexture){if(oe)if(ie)t.texStorage2D(n.TEXTURE_2D,Ze,Z,X.width,X.height);else{let ne=X.width,Te=X.height;for(let Xe=0;Xe<Ze;Xe++)t.texImage2D(n.TEXTURE_2D,Xe,Z,ne,Te,0,ae,D,null),ne>>=1,Te>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in n){let ne=n.canvas;if(ne.hasAttribute("layoutsubtree")||ne.setAttribute("layoutsubtree","true"),X.parentNode!==ne){ne.appendChild(X),d.add(y),ne.onpaint=Te=>{let Xe=Te.changedElements;for(let pe of d)Xe.includes(pe.image)&&(pe.needsUpdate=!0)},ne.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,X);else{let Xe=n.RGBA,pe=n.RGBA,yt=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Xe,pe,yt,X)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(ce.length>0){if(ie&&oe){let ne=Be(ce[0]);t.texStorage2D(n.TEXTURE_2D,Ze,Z,ne.width,ne.height)}for(let ne=0,Te=ce.length;ne<Te;ne++)j=ce[ne],ie?we&&t.texSubImage2D(n.TEXTURE_2D,ne,0,0,ae,D,j):t.texImage2D(n.TEXTURE_2D,ne,Z,ae,D,j);y.generateMipmaps=!1}else if(ie){if(oe){let ne=Be(X);t.texStorage2D(n.TEXTURE_2D,Ze,Z,ne.width,ne.height)}we&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ae,D,X)}else t.texImage2D(n.TEXTURE_2D,0,Z,ae,D,X);C(y)&&y.mipmapsAutoUpdate===!0&&b(ee),ue.__version=se.version,y.onUpdate&&y.onUpdate(y)}M.__version=y.version}function Rn(M,y,k){if(y.image.length!==6)return;let ee=Et(M,y),K=y.source;t.bindTexture(n.TEXTURE_CUBE_MAP,M.__webglTexture,n.TEXTURE0+k);let se=i.get(K);if(K.version!==se.__version||ee===!0){t.activeTexture(n.TEXTURE0+k);let ue=ot.getPrimaries(ot.workingColorSpace),q=y.colorSpace===Vr?null:ot.getPrimaries(y.colorSpace),X=y.colorSpace===Vr||ue===q?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,X);let ae=y.isCompressedTexture||y.image[0].isCompressedTexture,D=y.image[0]&&y.image[0].isDataTexture,Z=[];for(let pe=0;pe<6;pe++)!ae&&!D?Z[pe]=S(y.image[pe],!0,r.maxCubemapSize):Z[pe]=D?y.image[pe].image:y.image[pe],Z[pe]=Ne(y,Z[pe]);let j=Z[0],ce=s.convert(y.format,y.colorSpace),ie=s.convert(y.type),oe=w(y.internalFormat,ce,ie,y.normalized,y.colorSpace),we=y.isVideoTexture!==!0,Ze=se.__version===void 0||ee===!0,ne=K.dataReady,Te=E(y,j);vt(n.TEXTURE_CUBE_MAP,y);let Xe;if(y.isDepthTexture){if(oe=v(y.format===Br,y.type),Ze)if(we)t.texStorage2D(n.TEXTURE_CUBE_MAP,1,oe,j.width,j.height);else for(let pe=0;pe<6;pe++)t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,oe,j.width,j.height,0,ce,ie,null)}else if(ae){we&&Ze&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Te,oe,j.width,j.height);for(let pe=0;pe<6;pe++){Xe=Z[pe].mipmaps;for(let yt=0;yt<Xe.length;yt++){let Qt=Xe[yt];y.format!==Ti?ce!==null?we?ne&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt,0,0,Qt.width,Qt.height,ce,Qt.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt,oe,Qt.width,Qt.height,0,Qt.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):we?ne&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt,0,0,Qt.width,Qt.height,ce,ie,Qt.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt,oe,Qt.width,Qt.height,0,ce,ie,Qt.data)}}}else{if(Xe=y.mipmaps,we&&Ze){Xe.length>0&&Te++;let pe=Be(Z[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Te,oe,pe.width,pe.height)}for(let pe=0;pe<6;pe++)if(D){we?ne&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,0,0,Z[pe].width,Z[pe].height,ce,ie,Z[pe].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,oe,Z[pe].width,Z[pe].height,0,ce,ie,Z[pe].data);for(let yt=0;yt<Xe.length;yt++){let Hr=Xe[yt].image[pe].image;we?ne&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt+1,0,0,Hr.width,Hr.height,ce,ie,Hr.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt+1,oe,Hr.width,Hr.height,0,ce,ie,Hr.data)}}else{we?ne&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,0,0,ce,ie,Z[pe]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,oe,ce,ie,Z[pe]);for(let yt=0;yt<Xe.length;yt++){let Qt=Xe[yt];we?ne&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt+1,0,0,ce,ie,Qt.image[pe]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+pe,yt+1,oe,ce,ie,Qt.image[pe])}}}C(y)&&y.mipmapsAutoUpdate===!0&&b(n.TEXTURE_CUBE_MAP),se.__version=K.version,y.onUpdate&&y.onUpdate(y)}M.__version=y.version}function Rt(M,y,k,ee,K,se){let ue=s.convert(k.format,k.colorSpace),q=s.convert(k.type),X=w(k.internalFormat,ue,q,k.normalized,k.colorSpace),ae=i.get(y),D=i.get(k);if(D.__renderTarget=y,!ae.__hasExternalTextures){let Z=Math.max(1,y.width>>se),j=Math.max(1,y.height>>se);K===n.TEXTURE_3D||K===n.TEXTURE_2D_ARRAY?t.texImage3D(K,se,X,Z,j,y.depth,0,ue,q,null):t.texImage2D(K,se,X,Z,j,0,ue,q,null)}t.bindFramebuffer(n.FRAMEBUFFER,M),fe(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ee,K,D.__webglTexture,0,Dt(y)):(K===n.TEXTURE_2D||K>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ee,K,D.__webglTexture,se),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Di(M,y,k){if(n.bindRenderbuffer(n.RENDERBUFFER,M),y.depthBuffer){let ee=y.depthTexture,K=ee&&ee.isDepthTexture?ee.type:null,se=v(y.stencilBuffer,K),ue=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;fe(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Dt(y),se,y.width,y.height):k?n.renderbufferStorageMultisample(n.RENDERBUFFER,Dt(y),se,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,se,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,ue,n.RENDERBUFFER,M)}else{let ee=y.textures;for(let K=0;K<ee.length;K++){let se=ee[K],ue=s.convert(se.format,se.colorSpace),q=s.convert(se.type),X=w(se.internalFormat,ue,q,se.normalized,se.colorSpace);fe(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Dt(y),X,y.width,y.height):k?n.renderbufferStorageMultisample(n.RENDERBUFFER,Dt(y),X,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,X,y.width,y.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Jt(M,y,k){let ee=y.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,M),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let K=i.get(y.depthTexture);K.__renderTarget=y;let se=ee?y.depthTexture.image[0]:y.depthTexture.image;(!K.__webglTexture||se.width!==y.width||se.height!==y.height)&&(se.width=y.width,se.height=y.height,y.depthTexture.needsUpdate=!0),ee?ve(y.depthTexture,0):ge(y.depthTexture,0);let ue=K.__webglTexture,q=Dt(y),X=ee?n.TEXTURE_CUBE_MAP_POSITIVE_X+k:n.TEXTURE_2D,ae=y.depthTexture.format===Br?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(y.depthTexture.format===Or)fe(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ae,X,ue,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,ae,X,ue,0);else if(y.depthTexture.format===Br)fe(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ae,X,ue,0,q):n.framebufferTexture2D(n.FRAMEBUFFER,ae,X,ue,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Yn(M){let y=i.get(M),k=M.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==M.depthTexture){let ee=M.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),ee){let K=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,ee.removeEventListener("dispose",K)};ee.addEventListener("dispose",K),y.__depthDisposeCallback=K}y.__boundDepthTexture=ee}if(M.depthTexture&&!y.__autoAllocateDepthBuffer)if(k)for(let ee=0;ee<6;ee++)Jt(y.__webglFramebuffer[ee],M,ee);else M.texture.mipmaps.length>0?Jt(y.__webglFramebuffer[0],M,0):Jt(y.__webglFramebuffer,M,0);else if(k){y.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)if(t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[ee]),y.__webglDepthbuffer[ee]===void 0)y.__webglDepthbuffer[ee]=n.createRenderbuffer(),Di(y.__webglDepthbuffer[ee],M,!1);else{let K=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,se=y.__webglDepthbuffer[ee];n.bindRenderbuffer(n.RENDERBUFFER,se),n.framebufferRenderbuffer(n.FRAMEBUFFER,K,n.RENDERBUFFER,se)}}else if(M.texture.mipmaps.length>0?t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=n.createRenderbuffer(),Di(y.__webglDepthbuffer,M,!1);else{let K=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,se=y.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,se),n.framebufferRenderbuffer(n.FRAMEBUFFER,K,n.RENDERBUFFER,se)}t.bindFramebuffer(n.FRAMEBUFFER,null)}function Zn(M,y,k){let ee=i.get(M);y!==void 0&&Rt(ee.__webglFramebuffer,M,M.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),k!==void 0&&Yn(M)}function Kn(M){let y=M.texture,k=i.get(M),ee=i.get(y);M.addEventListener("dispose",U),O(M);let K=M.textures,se=M.isWebGLCubeRenderTarget===!0,ue=K.length>1;if(ue||(ee.__webglTexture===void 0&&(ee.__webglTexture=n.createTexture()),ee.__version=y.version,o.memory.textures++),se){k.__webglFramebuffer=[];for(let q=0;q<6;q++)if(y.mipmaps.length>0){k.__webglFramebuffer[q]=[];for(let X=0;X<y.mipmaps.length;X++)k.__webglFramebuffer[q][X]=n.createFramebuffer()}else k.__webglFramebuffer[q]=n.createFramebuffer()}else{if(y.mipmaps.length>0){k.__webglFramebuffer=[];for(let q=0;q<y.mipmaps.length;q++)k.__webglFramebuffer[q]=n.createFramebuffer()}else k.__webglFramebuffer=n.createFramebuffer();if(ue)for(let q=0,X=K.length;q<X;q++){let ae=i.get(K[q]);ae.__webglTexture===void 0&&(ae.__webglTexture=n.createTexture(),o.memory.textures++)}if(M.samples>0&&fe(M)===!1){k.__webglMultisampledFramebuffer=n.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let q=0;q<K.length;q++){let X=K[q];k.__webglColorRenderbuffer[q]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,k.__webglColorRenderbuffer[q]);let ae=s.convert(X.format,X.colorSpace),D=s.convert(X.type),Z=w(X.internalFormat,ae,D,X.normalized,X.colorSpace,M.isXRRenderTarget===!0),j=Dt(M);n.renderbufferStorageMultisample(n.RENDERBUFFER,j,Z,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+q,n.RENDERBUFFER,k.__webglColorRenderbuffer[q])}n.bindRenderbuffer(n.RENDERBUFFER,null),M.depthBuffer&&(k.__webglDepthRenderbuffer=n.createRenderbuffer(),Di(k.__webglDepthRenderbuffer,M,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(se){t.bindTexture(n.TEXTURE_CUBE_MAP,ee.__webglTexture),vt(n.TEXTURE_CUBE_MAP,y);for(let q=0;q<6;q++)if(y.mipmaps.length>0)for(let X=0;X<y.mipmaps.length;X++)Rt(k.__webglFramebuffer[q][X],M,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+q,X);else Rt(k.__webglFramebuffer[q],M,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+q,0);C(y)?b(n.TEXTURE_CUBE_MAP):y.mipmaps.length>0&&n.texParameteri(n.TEXTURE_CUBE_MAP,n.TEXTURE_MAX_LEVEL,y.mipmaps.length-1),t.unbindTexture()}else if(ue){for(let q=0,X=K.length;q<X;q++){let ae=K[q],D=i.get(ae),Z=n.TEXTURE_2D;(M.isWebGL3DRenderTarget||M.isWebGLArrayRenderTarget)&&(Z=M.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Z,D.__webglTexture),vt(Z,ae),Rt(k.__webglFramebuffer,M,ae,n.COLOR_ATTACHMENT0+q,Z,0),C(ae)&&b(Z)}t.unbindTexture()}else{let q=n.TEXTURE_2D;if((M.isWebGL3DRenderTarget||M.isWebGLArrayRenderTarget)&&(q=M.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(q,ee.__webglTexture),vt(q,y),y.mipmaps.length>0)for(let X=0;X<y.mipmaps.length;X++)Rt(k.__webglFramebuffer[X],M,y,n.COLOR_ATTACHMENT0,q,X);else Rt(k.__webglFramebuffer,M,y,n.COLOR_ATTACHMENT0,q,0);C(y)?b(q):y.mipmaps.length>0&&n.texParameteri(q,n.TEXTURE_MAX_LEVEL,y.mipmaps.length-1),t.unbindTexture()}M.depthBuffer&&Yn(M)}function N(M){let y=M.textures;for(let k=0,ee=y.length;k<ee;k++){let K=y[k];if(C(K)&&K.mipmapsAutoUpdate===!0){let se=T(M),ue=i.get(K).__webglTexture;t.bindTexture(se,ue),b(se),t.unbindTexture()}}}let Jn=[];function Tt(M){if(M.samples>0){if(fe(M)===!1){let y=M.textures,k=M.width,ee=M.height,K=n.COLOR_BUFFER_BIT,se=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ue=i.get(M),q=y.length>1;if(q)for(let ae=0;ae<y.length;ae++)t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ae,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ae,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ue.__webglMultisampledFramebuffer),M.texture.mipmaps.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglFramebuffer);for(let ae=0;ae<y.length;ae++){if(M.resolveDepthBuffer&&(M.depthBuffer&&(K|=n.DEPTH_BUFFER_BIT),M.stencilBuffer&&M.resolveStencilBuffer&&(K|=n.STENCIL_BUFFER_BIT)),q){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ue.__webglColorRenderbuffer[ae]);let D=i.get(y[ae]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,D,0)}n.blitFramebuffer(0,0,k,ee,0,0,k,ee,K,n.NEAREST),c===!0&&(Jn.length=0,Jn.push(n.COLOR_ATTACHMENT0+ae),M.depthBuffer&&M.storeMultisampledDepthBuffer===!1&&Jn.push(se),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Jn))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),q)for(let ae=0;ae<y.length;ae++){t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ae,n.RENDERBUFFER,ue.__webglColorRenderbuffer[ae]);let D=i.get(y[ae]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ae,n.TEXTURE_2D,D,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ue.__webglMultisampledFramebuffer)}else if(M.depthBuffer&&M.storeMultisampledDepthBuffer===!1&&c){let y=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[y])}}}function Dt(M){return Math.min(r.maxSamples,M.samples)}function fe(M){let y=i.get(M);return M.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function qt(M){let y=o.render.frame;u.get(M)!==y&&(u.set(M,y),M.update())}function Ne(M,y){let k=M.colorSpace,ee=M.format,K=M.type;return M.isCompressedTexture===!0||M.isVideoTexture===!0||k!==yl&&k!==Vr&&(ot.getTransfer(k)===gt?(ee!==Ti||K!==kn)&&Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Fe("WebGLTextures: Unsupported texture color space:",k)),y}function Be(M){return typeof HTMLImageElement<"u"&&M instanceof HTMLImageElement?(l.width=M.naturalWidth||M.width,l.height=M.naturalHeight||M.height):typeof VideoFrame<"u"&&M instanceof VideoFrame?(l.width=M.displayWidth,l.height=M.displayHeight):(l.width=M.width,l.height=M.height),l}this.allocateTextureUnit=He,this.resetTextureUnits=J,this.getTextureUnits=Q,this.setTextureUnits=Me,this.setTexture2D=ge,this.setTexture2DArray=xe,this.setTexture3D=Re,this.setTextureCube=ve,this.rebindTextures=Zn,this.setupRenderTarget=Kn,this.updateRenderTargetMipmap=N,this.updateMultisampleRenderTarget=Tt,this.setupDepthRenderbuffer=Yn,this.setupFrameBufferTexture=Rt,this.useMultisampledRTT=fe,this.dispose=z}function R2(n,e){function t(i,r=Vr){let s,o=ot.getTransfer(r);if(i===kn)return n.UNSIGNED_BYTE;if(i===Nh)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Ph)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Jy)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Qy)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Zy)return n.BYTE;if(i===Ky)return n.SHORT;if(i===Wa)return n.UNSIGNED_SHORT;if(i===Rh)return n.INT;if(i===bi)return n.UNSIGNED_INT;if(i===wi)return n.FLOAT;if(i===Ci)return n.HALF_FLOAT;if(i===e_)return n.ALPHA;if(i===t_)return n.RGB;if(i===Ti)return n.RGBA;if(i===Or)return n.DEPTH_COMPONENT;if(i===Br)return n.DEPTH_STENCIL;if(i===n_)return n.RED;if(i===Oh)return n.RED_INTEGER;if(i===Es)return n.RG;if(i===Lh)return n.RG_INTEGER;if(i===Fh)return n.RGBA_INTEGER;if(i===zl||i===Gl||i===jl||i===Wl)if(o===gt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===zl)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Gl)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===jl)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Wl)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===zl)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Gl)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===jl)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Wl)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===kh||i===Uh||i===Bh||i===Vh)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===kh)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Uh)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Bh)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Vh)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Hh||i===zh||i===Gh||i===jh||i===Wh||i===$l||i===$h)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Hh||i===zh)return o===gt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===Gh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(i===jh)return s.COMPRESSED_R11_EAC;if(i===Wh)return s.COMPRESSED_SIGNED_R11_EAC;if(i===$l)return s.COMPRESSED_RG11_EAC;if(i===$h)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===qh||i===Xh||i===Yh||i===Zh||i===Kh||i===Jh||i===Qh||i===ep||i===tp||i===np||i===ip||i===rp||i===sp||i===op)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===qh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Xh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Yh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Zh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Kh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Jh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Qh)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===ep)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===tp)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===np)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===ip)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===rp)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===sp)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===op)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===ap||i===cp||i===lp)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===ap)return o===gt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===cp)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===lp)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===up||i===dp||i===ql||i===fp)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===up)return s.COMPRESSED_RED_RGTC1_EXT;if(i===dp)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ql)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===fp)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===So?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}var N2=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,P2=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,M_=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let i=new Il(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,i=new Qi({vertexShader:N2,fragmentShader:P2,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Wt(new vo(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},b_=class extends Ki{constructor(e,t){super();let i=this,r=null,s=1,o=null,a="local-floor",c=1,l=null,u=null,d=null,f=null,h=null,g=null,x=typeof XRWebGLBinding<"u",p=new M_,m={},S=t.getContextAttributes(),C=null,b=null,T=[],w=[],v=new et,E=null,O=null,R=new Dn;R.viewport=new At;let P=new Dn;P.viewport=new At;let U=[R,P],G=new Ch,I=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let ge=T[Y];return ge===void 0&&(ge=new ka,T[Y]=ge),ge.getTargetRaySpace()},this.getControllerGrip=function(Y){let ge=T[Y];return ge===void 0&&(ge=new ka,T[Y]=ge),ge.getGripSpace()},this.getHand=function(Y){let ge=T[Y];return ge===void 0&&(ge=new ka,T[Y]=ge),ge.getHandSpace()};function $(Y){let ge=w.indexOf(Y.inputSource);if(ge===-1)return;let xe=T[ge];xe!==void 0&&(xe.update(Y.inputSource,Y.frame,l||o),xe.dispatchEvent({type:Y.type,data:Y.inputSource}))}function H(){r.removeEventListener("select",$),r.removeEventListener("selectstart",$),r.removeEventListener("selectend",$),r.removeEventListener("squeeze",$),r.removeEventListener("squeezestart",$),r.removeEventListener("squeezeend",$),r.removeEventListener("end",H),r.removeEventListener("inputsourceschange",te);for(let Y=0;Y<T.length;Y++){let ge=w[Y];ge!==null&&(w[Y]=null,T[Y].disconnect(ge))}I=null,z=null,p.reset();for(let Y in m)delete m[Y];if(e.setRenderTarget(C),h=null,f=null,d=null,r=null,b=null,He.stop(),i.isPresenting=!1,e.setPixelRatio(E),e.setSize(v.width,v.height,!1),O!==null){let Y=O.camera;Y.fov=O.fov,Y.zoom=O.zoom,Y.updateProjectionMatrix(),O=null}i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){s=Y,i.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){a=Y,i.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(Y){l=Y},this.getBaseLayer=function(){return f!==null?f:h},this.getBinding=function(){return d===null&&x&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(Y){if(r=Y,r!==null){if(C=e.getRenderTarget(),r.addEventListener("select",$),r.addEventListener("selectstart",$),r.addEventListener("selectend",$),r.addEventListener("squeeze",$),r.addEventListener("squeezestart",$),r.addEventListener("squeezeend",$),r.addEventListener("end",H),r.addEventListener("inputsourceschange",te),S.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(v),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let xe=null,Re=null,ve=null;S.depth&&(ve=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,xe=S.stencil?Br:Or,Re=S.stencil?So:bi);let We={colorFormat:t.RGBA8,depthFormat:ve,scaleFactor:s};d=this.getBinding(),f=d.createProjectionLayer(We),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),b=new $n(f.textureWidth,f.textureHeight,{format:Ti,type:kn,depthTexture:new kr(f.textureWidth,f.textureHeight,Re,void 0,void 0,void 0,void 0,void 0,void 0,xe),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}else{let xe={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:s};h=new XRWebGLLayer(r,t,xe),r.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),b=new $n(h.framebufferWidth,h.framebufferHeight,{format:Ti,type:kn,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1,storeMultisampledDepthBuffer:h.ignoreDepthValues===!1,storeMultisampledStencilBuffer:h.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(a),He.setContext(r),He.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function te(Y){for(let ge=0;ge<Y.removed.length;ge++){let xe=Y.removed[ge],Re=w.indexOf(xe);Re>=0&&(w[Re]=null,T[Re].disconnect(xe))}for(let ge=0;ge<Y.added.length;ge++){let xe=Y.added[ge],Re=w.indexOf(xe);if(Re===-1){for(let We=0;We<T.length;We++)if(We>=w.length){w.push(xe),Re=We;break}else if(w[We]===null){w[We]=xe,Re=We;break}if(Re===-1)break}let ve=T[Re];ve&&ve.connect(xe)}}function W(Y,ge){ge===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(ge.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(r===null)return;let ge=Y.near,xe=Y.far;p.texture!==null&&(p.depthNear>0&&(ge=p.depthNear),p.depthFar>0&&(xe=p.depthFar)),G.near=P.near=R.near=ge,G.far=P.far=R.far=xe,(I!==G.near||z!==G.far)&&(r.updateRenderState({depthNear:G.near,depthFar:G.far}),I=G.near,z=G.far),G.layers.mask=Y.layers.mask|6,R.layers.mask=G.layers.mask&-5,P.layers.mask=G.layers.mask&-3;let Re=Y.parent,ve=G.cameras;W(G,Re);for(let We=0;We<ve.length;We++)W(ve[We],Re);G.projectionMatrix.copy(R.projectionMatrix),G.projectionMatrixInverse.copy(R.projectionMatrixInverse),O===null&&Y.isPerspectiveCamera&&(O={camera:Y,fov:Y.fov,zoom:Y.zoom}),J(Y,G,Re)};function J(Y,ge,xe){xe===null?Y.matrix.copy(ge.matrixWorld):(Y.matrix.copy(xe.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(ge.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(ge.projectionMatrix),Y.projectionMatrixInverse.copy(ge.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=Oa*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return G},this.getFoveation=function(){if(!(f===null&&h===null))return c},this.setFoveation=function(Y){c=Y,f!==null&&(f.fixedFoveation=Y),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=Y)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(G)},this.getCameraTexture=function(Y){return m[Y]};let Q=null;function Me(Y,ge){if(u=ge.getViewerPose(l||o),g=ge,u!==null){let xe=u.views;h!==null&&(e.setRenderTargetFramebuffer(b,h.framebuffer),e.setRenderTarget(b));let Re=!1;xe.length!==G.cameras.length&&(G.cameras.length=0,Re=!0);for(let Oe=0;Oe<xe.length;Oe++){let vt=xe[Oe],Et=null;if(h!==null)Et=h.getViewport(vt);else{let an=d.getViewSubImage(f,vt);Et=an.viewport,Oe===0&&(e.setRenderTargetTextures(b,an.colorTexture,an.depthStencilTexture),e.setRenderTarget(b))}let nt=U[Oe];nt===void 0&&(nt=new Dn,nt.layers.enable(Oe),nt.viewport=new At,U[Oe]=nt),nt.matrix.fromArray(vt.transform.matrix),nt.matrix.decompose(nt.position,nt.quaternion,nt.scale),nt.projectionMatrix.fromArray(vt.projectionMatrix),nt.projectionMatrixInverse.copy(nt.projectionMatrix).invert(),nt.viewport.set(Et.x,Et.y,Et.width,Et.height),Oe===0&&(G.matrix.copy(nt.matrix),G.matrix.decompose(G.position,G.quaternion,G.scale)),Re===!0&&G.cameras.push(nt)}let ve=r.enabledFeatures;if(ve&&ve.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&x){d=i.getBinding();let Oe=d.getDepthInformation(xe[0]);Oe&&Oe.isValid&&Oe.texture&&p.init(Oe,r.renderState)}if(ve&&ve.includes("camera-access")&&x){e.state.unbindTexture(),d=i.getBinding();for(let Oe=0;Oe<xe.length;Oe++){let vt=xe[Oe].camera;if(vt){let Et=m[vt];Et||(Et=new Il,m[vt]=Et);let nt=d.getCameraImage(vt);Et.sourceTexture=nt}}}}for(let xe=0;xe<T.length;xe++){let Re=w[xe],ve=T[xe];Re!==null&&ve!==void 0&&ve.update(Re,ge,l||o)}Q&&Q(Y,ge),ge.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:ge}),g=null}let He=new Vw;He.setAnimationLoop(Me),this.setAnimationLoop=function(Y){Q=Y},this.dispose=function(){}}},O2=new wt,Zw=new Ue;Zw.set(-1,0,0,0,1,0,0,0,1);function L2(n,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function i(p,m){m.color.getRGB(p.fogColor.value,d_(n)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function r(p,m,S,C,b){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?s(p,m):m.isMeshLambertMaterial?(s(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(s(p,m),d(p,m)):m.isMeshPhongMaterial?(s(p,m),u(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(s(p,m),f(p,m),m.isMeshPhysicalMaterial&&h(p,m,b)):m.isMeshMatcapMaterial?(s(p,m),g(p,m)):m.isMeshDepthMaterial?s(p,m):m.isMeshDistanceMaterial?(s(p,m),x(p,m)):m.isMeshNormalMaterial?s(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?c(p,m,S,C):m.isSpriteMaterial?l(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function s(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===An&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===An&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let S=e.get(m),C=S.envMap,b=S.envMapRotation;C&&(p.envMap.value=C,p.envMapRotation.value.setFromMatrix4(O2.makeRotationFromEuler(b)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Zw),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function c(p,m,S,C){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*S,p.scale.value=C*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function l(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function u(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function d(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function f(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function h(p,m,S){p.ior.value=m.ior,m.diffuseRoughness>0&&(p.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(p.diffuseRoughnessMap.value=m.diffuseRoughnessMap,t(m.diffuseRoughnessMap,p.diffuseRoughnessMapTransform))),m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===An&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,p.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=S.texture,p.transmissionSamplerSize.value.set(S.width,S.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function x(p,m){let S=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(S.matrixWorld),p.nearDistance.value=S.shadow.camera.near,p.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function F2(n,e,t,i){let r={},s={};function o(S,C){let b=C.program;i.uniformBlockBinding(S,b,r[S.id])}function a(S,C){let b=r[S.id];b===void 0&&(g(S),b=c(S),r[S.id]=b,S.addEventListener("dispose",p));let T=C.program;i.updateUBOMapping(S,T);let w=e.render.frame;s[S.id]!==w&&(l(S),s[S.id]=w)}function c(S){let C=n.createBuffer(),b=S.__size,T=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,C),n.bufferData(n.UNIFORM_BUFFER,b,T),n.bindBuffer(n.UNIFORM_BUFFER,null),C}function l(S){let C=r[S.id],b=S.uniforms,T=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,C);for(let w=0,v=b.length;w<v;w++){let E=b[w];if(Array.isArray(E))for(let O=0,R=E.length;O<R;O++)u(E[O],w,O,T);else u(E,w,0,T)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function u(S,C,b,T){if(f(S,C,b,T)===!0){let w=S.__offset,v=S.value;if(Array.isArray(v)){let E=0;for(let O=0;O<v.length;O++){let R=v[O],P=x(R,!0);d(R,S.__data,E),E+=P.storage/Float32Array.BYTES_PER_ELEMENT}}else d(v,S.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,w,S.__data)}}function d(S,C,b){typeof S=="number"||typeof S=="boolean"?C[b]=S:S.isMatrix3?(C[b]=S.elements[0],C[b+1]=S.elements[1],C[b+2]=S.elements[2],C[b+3]=0,C[b+4]=S.elements[3],C[b+5]=S.elements[4],C[b+6]=S.elements[5],C[b+7]=0,C[b+8]=S.elements[6],C[b+9]=S.elements[7],C[b+10]=S.elements[8],C[b+11]=0):ArrayBuffer.isView(S)?C.set(S.subarray(0,C.length-b),b):S.toArray(C,b)}function f(S,C,b,T){let w=S.value,v=C+"_"+b;if(Array.isArray(w)){T[v]===void 0&&(T[v]=[]);let E=T[v],O=!1;for(let R=0;R<w.length;R++)h(w[R],E,R)===!0&&(O=!0);return O}return h(w,T,v)}function h(S,C,b){if(C[b]===void 0)return typeof S=="number"||typeof S=="boolean"?C[b]=S:ArrayBuffer.isView(S)?C[b]=S.slice():C[b]=S.clone(),!0;{let T=C[b];if(typeof S=="number"||typeof S=="boolean"){if(T!==S)return C[b]=S,!0}else{if(ArrayBuffer.isView(S))return!0;if(T.equals(S)===!1)return T.copy(S),!0}}return!1}function g(S){let C=S.uniforms,b=0,T=16;for(let v=0,E=C.length;v<E;v++){let O=Array.isArray(C[v])?C[v]:[C[v]];for(let R=0,P=O.length;R<P;R++){let U=O[R],G=Array.isArray(U.value)?U.value:[U.value],I=Array.isArray(C[v])||Array.isArray(U.value),z=b;for(let H=0,te=G.length;H<te;H++){let W=G[H],J=x(W,I),Q=b%T,Me=Q%J.boundary,He=Q+Me;b+=Me,He!==0&&T-He<J.storage&&(b+=T-He),H===0&&(z=b),b+=J.storage}let $=U.type==="int"?Int32Array:U.type==="uint"?Uint32Array:Float32Array;U.__data=new $((b-z)/Float32Array.BYTES_PER_ELEMENT),U.__offset=z}}let w=b%T;return w>0&&(b+=T-w),S.__size=b,S.__cache={},this}function x(S,C){let b={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(b.boundary=4,b.storage=4):S.isVector2?(b.boundary=8,b.storage=8):S.isVector3||S.isColor?(b.boundary=16,b.storage=12):S.isVector4?(b.boundary=16,b.storage=16):S.isMatrix3?(b.boundary=16,b.storage=48):S.isMatrix4?(b.boundary=16,b.storage=64):S.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(b.boundary=16,b.storage=S.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",S),C===!0&&(b.boundary=16,b.storage=Math.ceil(b.storage/16)*16),b}function p(S){let C=S.target;C.removeEventListener("dispose",p),n.deleteBuffer(r[C.id]),delete r[C.id],delete s[C.id]}function m(){for(let S in r)n.deleteBuffer(r[S]);r={},s={}}return{bind:o,update:a,dispose:m}}var k2=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ir=null;function U2(){return ir===null&&(ir=new ah(k2,16,16,Es,Ci),ir.name="DFG_LUT",ir.minFilter=In,ir.magFilter=In,ir.wrapS=Yi,ir.wrapT=Yi,ir.generateMipmaps=!1,ir.needsUpdate=!0),ir}var vp=class{constructor(e={}){let{canvas:t=lw(),context:i=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:f=!1,outputBufferType:h=kn}=e;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=o;let x=h,p=new Set([Fh,Lh,Oh]),m=new Set([kn,bi,Wa,So,Nh,Ph]),S=new Uint32Array(4),C=new Int32Array(4),b={textures:[],min:[],max:[],resolution:[]},T=null,w=null,v=[],E=[],O=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=nr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,P=!1,U=null,G=null,I=null,z=null;this._outputColorSpace=Wn;let $=0,H=0,te=null,W=-1,J=null,Q=new At,Me=new At,He=null,Y=new je(0),ge=0,xe=t.width,Re=t.height,ve=1,We=null,kt=null,Oe=new At(0,0,xe,Re),vt=new At(0,0,xe,Re),Et=!1,nt=new ms,an=new ch,$t=!1,Rn=!1,Rt=new wt,Di=new L,Jt=new At,Yn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Zn=!1;function Kn(){return te===null?ve:1}let N=i;function Jn(_,A){return t.getContext(_,A)}let Tt,Dt,fe,qt,Ne,Be,M,y,k,ee,K,se,ue,q,X,ae,D,Z,j,ce,ie,oe,we;try{let _={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"187"}`),t.addEventListener("webglcontextlost",Te,!1),t.addEventListener("webglcontextrestored",Xe,!1),t.addEventListener("webglcontextcreationerror",pe,!1),N===null){let A="webgl2";if(N=Jn(A,_),N===null)throw Jn(A)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ze()}catch(_){throw t.removeEventListener("webglcontextlost",Te,!1),t.removeEventListener("webglcontextrestored",Xe,!1),t.removeEventListener("webglcontextcreationerror",pe,!1),Fe("WebGLRenderer: "+_.message),_}function Ze(){Tt=new YF(N),Tt.init(),ie=new R2(N,Tt),Dt=new UF(N,Tt,e,ie),fe=new I2(N,Tt),Dt.reversedDepthBuffer&&f&&fe.buffers.depth.setReversed(!0),G=N.createFramebuffer(),I=N.createFramebuffer(),z=N.createFramebuffer(),qt=new JF(N),Ne=new m2,Be=new A2(N,Tt,fe,Ne,Dt,ie,qt),M=new XF(R),y=new eO(N),oe=new FF(N,y),k=new ZF(N,y,qt,oe),ee=new ek(N,k,y,oe,qt),Z=new QF(N,Dt,Be),X=new BF(Ne),K=new p2(R,M,Tt,Dt,oe,X),se=new L2(R,Ne),ue=new v2,q=new M2(Tt),D=new LF(R,M,fe,ee,g,c),ae=new D2(R,ee,Dt),we=new F2(N,qt,Dt,fe),j=new kF(N,Tt,qt),ce=new KF(N,Tt,qt),qt.programs=K.programs,R.capabilities=Dt,R.extensions=Tt,R.properties=Ne,R.renderLists=ue,R.shadowMap=ae,R.state=fe,R.info=qt}x!==kn&&(O=new nk(x,t.width,t.height,a,r,s));let ne=new b_(R,N);this.xr=ne,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let _=Tt.get("WEBGL_lose_context");_&&_.loseContext()},this.forceContextRestore=function(){let _=Tt.get("WEBGL_lose_context");_&&_.restoreContext()},this.getPixelRatio=function(){return ve},this.setPixelRatio=function(_){_!==void 0&&(ve=_,this.setSize(xe,Re,!1))},this.getSize=function(_){return _.set(xe,Re)},this.setSize=function(_,A,V=!0){if(ne.isPresenting){Ae("WebGLRenderer: Can't change size while VR device is presenting.");return}xe=_,Re=A,t.width=Math.floor(_*ve),t.height=Math.floor(A*ve),V===!0&&(t.style.width=_+"px",t.style.height=A+"px"),O!==null&&O.setSize(t.width,t.height),this.setViewport(0,0,_,A)},this.getDrawingBufferSize=function(_){return _.set(xe*ve,Re*ve).floor()},this.setDrawingBufferSize=function(_,A,V){xe=_,Re=A,ve=V,t.width=Math.floor(_*V),t.height=Math.floor(A*V),this.setViewport(0,0,_,A)},this.setEffects=function(_){if(x===kn){Fe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(_){for(let A=0;A<_.length;A++)if(_[A].isOutputPass===!0){Ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}O.setEffects(_||[])},this.getCurrentViewport=function(_){return _.copy(Q)},this.getViewport=function(_){return _.copy(Oe)},this.setViewport=function(_,A,V,F){_.isVector4?Oe.set(_.x,_.y,_.z,_.w):Oe.set(_,A,V,F),fe.viewport(Q.copy(Oe).multiplyScalar(Kn()).round())},this.getScissor=function(_){return _.copy(vt)},this.setScissor=function(_,A,V,F){_.isVector4?vt.set(_.x,_.y,_.z,_.w):vt.set(_,A,V,F),fe.scissor(Me.copy(vt).multiplyScalar(Kn()).round())},this.getScissorTest=function(){return Et},this.setScissorTest=function(_){fe.setScissorTest(Et=_)},this.setOpaqueSort=function(_){We=_},this.setTransparentSort=function(_){kt=_},this.getClearColor=function(_){return _.copy(D.getClearColor())},this.setClearColor=function(){D.setClearColor(...arguments)},this.getClearAlpha=function(){return D.getClearAlpha()},this.setClearAlpha=function(){D.setClearAlpha(...arguments)},this.clear=function(_=!0,A=!0,V=!0){let F=0;if(_){let B=!1;if(te!==null){let de=te.texture.format;B=p.has(de)}if(B){let de=te.texture.type,_e=m.has(de),le=D.getClearColor(),ye=D.getClearAlpha(),be=le.r,ze=le.g,it=le.b;_e?(S[0]=be,S[1]=ze,S[2]=it,S[3]=ye,N.clearBufferuiv(N.COLOR,0,S)):(C[0]=be,C[1]=ze,C[2]=it,C[3]=ye,N.clearBufferiv(N.COLOR,0,C))}else F|=N.COLOR_BUFFER_BIT}A&&(F|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),V&&(F|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F!==0&&N.clear(F)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(_){_.setRenderer(this),U=_},this.dispose=function(){t.removeEventListener("webglcontextlost",Te,!1),t.removeEventListener("webglcontextrestored",Xe,!1),t.removeEventListener("webglcontextcreationerror",pe,!1),D.dispose(),ue.dispose(),q.dispose(),Be.dispose(),Ne.dispose(),M.dispose(),ee.dispose(),k.dispose(),oe.dispose(),we.dispose(),K.dispose(),ne.dispose(),ne.removeEventListener("sessionstart",T_),ne.removeEventListener("sessionend",D_),bs.stop()};function Te(_){_.preventDefault(),a_("WebGLRenderer: Context Lost."),P=!0}function Xe(){a_("WebGLRenderer: Context Restored."),P=!1;let _=qt.autoReset,A=ae.enabled,V=ae.autoUpdate,F=ae.needsUpdate,B=ae.type;Ze(),qt.autoReset=_,ae.enabled=A,ae.autoUpdate=V,ae.needsUpdate=F,ae.type=B}function pe(_){Fe("WebGLRenderer: A WebGL context could not be created. Reason: ",_.statusMessage)}function yt(_){let A=_.target;A.removeEventListener("dispose",yt),Qt(A)}function Qt(_){Hr(_),Ne.remove(_)}function Hr(_){let A=Ne.get(_).programs;A!==void 0&&(A.forEach(function(V){K.releaseProgram(V)}),_.isShaderMaterial&&K.releaseShaderCache(_))}this.renderBufferDirect=function(_,A,V,F,B,de){A===null&&(A=Yn);let _e=B.isMesh&&B.matrixWorld.determinantAffine()<0,le=rC(_,A,V,F,B);fe.setMaterial(F,_e);let ye=V.index,be=1;if(F.wireframe===!0){if(ye=k.getWireframeAttribute(V),ye===void 0)return;be=2}let ze=V.drawRange,it=V.attributes.position,Se=ze.start*be,rt=(ze.start+ze.count)*be;de!==null&&(Se=Math.max(Se,de.start*be),rt=Math.min(rt,(de.start+de.count)*be)),ye!==null?(Se=Math.max(Se,0),rt=Math.min(rt,ye.count)):it!=null&&(Se=Math.max(Se,0),rt=Math.min(rt,it.count));let Ut=rt-Se;if(Ut<0||Ut===1/0)return;oe.setup(B,F,le,V,ye);let bt,Mt=j;if(ye!==null&&(bt=y.get(ye),Mt=ce,Mt.setIndex(bt)),B.isMesh)F.wireframe===!0?(fe.setLineWidth(F.wireframeLinewidth*Kn()),Mt.setMode(N.LINES)):Mt.setMode(N.TRIANGLES);else if(B.isLine){let _n=F.linewidth;_n===void 0&&(_n=1),fe.setLineWidth(_n*Kn()),B.isLineSegments?Mt.setMode(N.LINES):B.isLineLoop?Mt.setMode(N.LINE_LOOP):Mt.setMode(N.LINE_STRIP)}else B.isPoints?Mt.setMode(N.POINTS):B.isSprite&&Mt.setMode(N.TRIANGLES);if(B.isBatchedMesh)if(Tt.get("WEBGL_multi_draw"))Mt.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{let _n=B._multiDrawStarts,Ee=B._multiDrawCounts,bn=B._multiDrawCount,lt=ye?y.get(ye).bytesPerElement:1,ws=Ne.get(F).currentProgram.getUniforms();for(let xn=0;xn<bn;xn++)ws.setValue(N,"_gl_DrawID",xn),Mt.render(_n[xn]/lt,Ee[xn])}else if(B.isInstancedMesh)Mt.renderInstances(Se,Ut,B.count);else if(V.isInstancedBufferGeometry){let _n=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,Ee=Math.min(V.instanceCount,_n);Mt.renderInstances(Se,Ut,Ee)}else Mt.render(Se,Ut)};function C_(_,A,V,F){U!==null&&_.isNodeMaterial&&U.setObject(F,_),$t===!0&&X.setState(_,V,!1),_.transparent===!0&&_.side===tr&&_.forceSinglePass===!1?(_.side=An,_.needsUpdate=!0,Ka(_,A,F),_.side=Ss,_.needsUpdate=!0,Ka(_,A,F),_.side=tr):Ka(_,A,F)}this.compile=function(_,A,V=null){V===null&&(V=_),U!==null&&U.renderStart(_,A,V),w=q.get(V),w.init(A),E.push(w),V.traverseVisible(function(B){B.isLight&&B.layers.test(A.layers)&&(w.pushLight(B),B.castShadow&&w.pushShadow(B))}),_!==V&&_.traverseVisible(function(B){B.isLight&&B.layers.test(A.layers)&&(w.pushLight(B),B.castShadow&&w.pushShadow(B))}),w.setupLights(),U!==null&&U.updateLights(w.state.lightsArray),Rn=this.localClippingEnabled,$t=X.init(this.clippingPlanes,Rn),$t===!0&&X.setGlobalState(this.clippingPlanes,A),U!==null&&ae.render(w.state.shadowsArray,V,A);let F=new Set;return _.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;let de=B.material;if(de)if(Array.isArray(de))for(let _e=0;_e<de.length;_e++){let le=de[_e];C_(le,V,A,B),F.add(le)}else C_(de,V,A,B),F.add(de)}),w=E.pop(),U!==null&&U.renderEnd(),F},this.compileAsync=function(_,A,V=null){let F=this.compile(_,A,V);return new Promise(B=>{function de(){if(F.forEach(function(_e){let ye=Ne.get(_e).currentProgram;(ye===void 0||ye.isReady())&&F.delete(_e)}),F.size===0){B(_);return}setTimeout(de,10)}Tt.get("KHR_parallel_shader_compile")!==null?de():setTimeout(de,10)})};let bp=null;function nC(_){bp&&bp(_)}function T_(){bs.stop()}function D_(){bs.start()}let bs=new Vw;bs.setAnimationLoop(nC),typeof self<"u"&&bs.setContext(self),this.setAnimationLoop=function(_){bp=_,ne.setAnimationLoop(_),_===null?bs.stop():bs.start()},ne.addEventListener("sessionstart",T_),ne.addEventListener("sessionend",D_),this.render=function(_,A){if(A!==void 0&&A.isCamera!==!0){Fe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;U!==null&&U.renderStart(_,A);let V=ne.enabled===!0&&ne.isPresenting===!0,F=O!==null&&(te===null||V)&&O.begin(R,te);if(_.matrixWorldAutoUpdate===!0&&_.updateMatrixWorld(),A.parent===null&&A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),ne.enabled===!0&&ne.isPresenting===!0&&(O===null||O.isCompositing()===!1)&&(ne.cameraAutoUpdate===!0&&ne.updateCamera(A),A=ne.getCamera()),_.isScene===!0&&_.onBeforeRender(R,_,A,te),w=q.get(_,E.length),w.init(A),w.state.textureUnits=Be.getTextureUnits(),E.push(w),Rt.multiplyMatrices(A.projectionMatrix,A.matrixWorldInverse),A.isArrayCamera?an.setFromArrayCamera(A):nt.setFromProjectionMatrix(Rt,ci,A.reversedDepth),Rn=this.localClippingEnabled,$t=X.init(this.clippingPlanes,Rn),T=ue.get(_,v.length),T.init(),v.push(T),this.info.render.frame++,ne.enabled===!0&&ne.isPresenting===!0){let _e=R.xr.getDepthSensingMesh();_e!==null&&wp(_e,A,-1/0,R.sortObjects)}wp(_,A,0,R.sortObjects),T.finish(),U!==null&&U.updateLights(w.state.lightsArray),R.sortObjects===!0&&T.sort(We,kt),Zn=ne.enabled===!1||ne.isPresenting===!1||ne.hasDepthSensing()===!1,Zn&&D.addToRenderList(T,_),this.info.autoReset===!0&&this.info.reset(),$t===!0&&X.beginShadows();let B=w.state.shadowsArray;if(ae.render(B,_,A),$t===!0&&X.endShadows(),(F&&O.hasRenderPass())===!1){let _e=T.opaque,le=T.transmissive;if(w.setupLights(),A.isArrayCamera){let ye=A.cameras;if(le.length>0)for(let be=0,ze=ye.length;be<ze;be++){let it=ye[be];A_(_e,le,_,it)}Zn&&D.render(_);for(let be=0,ze=ye.length;be<ze;be++){let it=ye[be];I_(T,_,it,it.viewport)}}else le.length>0&&A_(_e,le,_,A),Zn&&D.render(_),I_(T,_,A)}te!==null&&H===0&&(Be.updateMultisampleRenderTarget(te),Be.updateRenderTargetMipmap(te)),F&&O.end(R),_.isScene===!0&&_.onAfterRender(R,_,A),oe.resetDefaultState(),W=-1,J=null,E.pop(),E.length>0?(w=E[E.length-1],Be.setTextureUnits(w.state.textureUnits),$t===!0&&X.setGlobalState(R.clippingPlanes,w.state.camera)):w=null,v.pop(),v.length>0?T=v[v.length-1]:T=null,U!==null&&U.renderEnd()};function wp(_,A,V,F){if(_.visible===!1)return;if(_.layers.test(A.layers)){if(_.isGroup)V=_.renderOrder;else if(_.isLOD)_.autoUpdate===!0&&_.update(A);else if(_.isLight)w.pushLight(_),_.castShadow&&w.pushShadow(_);else if(_.isSprite){let _e=A.isArrayCamera?an:nt;if(!_.frustumCulled||_.intersectsFrustum(_e)){F&&Jt.setFromMatrixPosition(_.matrixWorld).applyMatrix4(Rt);let le=ee.update(_),ye=_.material;ye.visible&&T.push(_,le,ye,V,Jt.z,null,A)}}else if(_.isMesh||_.isLine||_.isPoints){let _e=A.isArrayCamera?an:nt;if(!_.frustumCulled||_.intersectsFrustum(_e)){let le=ee.update(_),ye=_.material;if(F&&(_.boundingSphere!==void 0?(_.boundingSphere===null&&_.computeBoundingSphere(),Jt.copy(_.boundingSphere.center)):(le.boundingSphere===null&&le.computeBoundingSphere(),Jt.copy(le.boundingSphere.center)),Jt.applyMatrix4(_.matrixWorld).applyMatrix4(Rt)),Array.isArray(ye)){let be=le.groups;for(let ze=0,it=be.length;ze<it;ze++){let Se=be[ze],rt=ye[Se.materialIndex];rt&&rt.visible&&T.push(_,le,rt,V,Jt.z,Se,A)}}else ye.visible&&T.push(_,le,ye,V,Jt.z,null,A)}}}let de=_.children;for(let _e=0,le=de.length;_e<le;_e++)wp(de[_e],A,V,F)}function I_(_,A,V,F){let{opaque:B,transmissive:de,transparent:_e}=_;w.setupLightsView(V),$t===!0&&X.setGlobalState(R.clippingPlanes,V),F&&fe.viewport(Q.copy(F)),B.length>0&&Ql(B,A,V),de.length>0&&Ql(de,A,V),_e.length>0&&Ql(_e,A,V),fe.buffers.depth.setTest(!0),fe.buffers.depth.setMask(!0),fe.buffers.color.setMask(!0),fe.setPolygonOffset(!1)}function A_(_,A,V,F){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[F.id]===void 0){let Se=Tt.has("EXT_color_buffer_half_float")||Tt.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[F.id]=new $n(1,1,{generateMipmaps:!0,type:Se?Ci:kn,minFilter:Ur,samples:Math.max(4,Dt.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:ot.workingColorSpace})}let de=w.state.transmissionRenderTarget[F.id],_e=F.viewport||Q;de.setSize(_e.z*R.transmissionResolutionScale,_e.w*R.transmissionResolutionScale);let le=R.getRenderTarget(),ye=R.getActiveCubeFace(),be=R.getActiveMipmapLevel();R.setRenderTarget(de),R.getClearColor(Y),ge=R.getClearAlpha(),ge<1&&R.setClearColor(16777215,.5),R.clear(),Zn&&D.render(V);let ze=R.toneMapping;R.toneMapping=nr;let it=F.viewport;if(F.viewport!==void 0&&(F.viewport=void 0),w.setupLightsView(F),$t===!0&&X.setGlobalState(R.clippingPlanes,F),Ql(_,V,F),Be.updateMultisampleRenderTarget(de),Be.updateRenderTargetMipmap(de),Tt.has("WEBGL_multisampled_render_to_texture")===!1){let Se=!1;for(let rt=0,Ut=A.length;rt<Ut;rt++){let bt=A[rt],{object:Mt,geometry:_n,material:Ee,group:bn}=bt;if(Ee.side===tr&&Mt.layers.test(F.layers)){let lt=Ee.side;Ee.side=An,Ee.needsUpdate=!0,R_(Mt,V,F,_n,Ee,bn),Ee.side=lt,Ee.needsUpdate=!0,Se=!0}}Se===!0&&(Be.updateMultisampleRenderTarget(de),Be.updateRenderTargetMipmap(de))}R.setRenderTarget(le,ye,be),R.setClearColor(Y,ge),it!==void 0&&(F.viewport=it),R.toneMapping=ze}function Ql(_,A,V){let F=A.isScene===!0?A.overrideMaterial:null;for(let B=0,de=_.length;B<de;B++){let _e=_[B],{object:le,geometry:ye,group:be}=_e,ze=_e.material;ze.allowOverride===!0&&F!==null&&(ze=F),le.layers.test(V.layers)&&R_(le,A,V,ye,ze,be)}}function R_(_,A,V,F,B,de){U!==null&&B.isNodeMaterial&&U.setObject(_,B),_.onBeforeRender(R,A,V,F,B,de),_.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,_.matrixWorld),_.normalMatrix.getNormalMatrix(_.modelViewMatrix),B.onBeforeRender(R,A,V,F,_,de),B.transparent===!0&&B.side===tr&&B.forceSinglePass===!1?(B.side=An,B.needsUpdate=!0,R.renderBufferDirect(V,A,F,B,_,de),B.side=Ss,B.needsUpdate=!0,R.renderBufferDirect(V,A,F,B,_,de),B.side=tr):R.renderBufferDirect(V,A,F,B,_,de),_.onAfterRender(R,A,V,F,B,de)}function N_(_){let A=0;for(let V of _)V.texture!==null&&A++;return A}function Ka(_,A,V){A.isScene!==!0&&(A=Yn);let F=Ne.get(_),B=w.state.lights,de=w.state.shadowsArray,_e=B.state.version,le=K.getParameters(_,B.state,de,A,V,w.state.lightProbeGridArray),ye=K.getProgramCacheKey(le),be=F.programs;F.environment=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?A.environment:null,F.fog=A.fog;let ze=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap;F.envMap=M.get(_.envMap||F.environment,ze),F.envMapRotation=F.environment!==null&&_.envMap===null?A.environmentRotation:_.envMapRotation,be===void 0&&(_.addEventListener("dispose",yt),be=new Map,F.programs=be,F.programVariants=new Map);let it=be.get(ye);if(it!==void 0){if(F.currentProgram===it&&F.lightsStateVersion===_e)return O_(_,le),it}else le.uniforms=K.getUniforms(_),U!==null&&_.isNodeMaterial&&U.build(_,V,le),_.onBeforeCompile(le,R),it=K.acquireProgram(le,ye),be.set(ye,it),F.uniforms=le.uniforms;let Se=F.uniforms;return(!_.isShaderMaterial&&!_.isRawShaderMaterial||_.clipping===!0)&&(Se.clippingPlanes=X.uniform),O_(_,le),F.needsLights=oC(_),F.lightsStateVersion=_e,F.needsLights&&(Se.ambientLightColor.value=B.state.ambient,Se.lightProbe.value=B.state.probe,Se.sunLights.value=B.state.sun,Se.sunLightShadows.value=B.state.sunShadow,Se.directionalLights.value=B.state.directional,Se.directionalLightShadows.value=B.state.directionalShadow,Se.spotLights.value=B.state.spot,Se.spotLightShadows.value=B.state.spotShadow,Se.rectAreaLights.value=B.state.rectArea,Se.ltc_1.value=B.state.rectAreaLTC1,Se.ltc_2.value=B.state.rectAreaLTC2,Se.pointLights.value=B.state.point,Se.pointLightShadows.value=B.state.pointShadow,Se.hemisphereLights.value=B.state.hemi,Se.sunShadowMatrix.value=B.state.sunShadowMatrix,Se.sunShadowCascade.value=B.state.sunShadowCascade,Se.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Se.spotLightMatrix.value=B.state.spotLightMatrix,Se.spotLightMap.value=B.state.spotLightMap,Se.pointShadowMatrix.value=B.state.pointShadowMatrix),F.numLightProbeGrids=N_(w.state.lightProbeGridArray),F.currentProgram=it,F.uniformsList=null,it}function iC(_,A,V,F,B){let de=Ne.get(_),_e=de.currentProgram.id+","+F+","+B,le=de.programVariants.get(_e);return le===void 0?(le=Ka(_,A,V),de.programVariants.set(_e,le)):(de.currentProgram=le,de.uniformsList=null,de.outputColorSpace=F,de.toneMapping=B),le}function P_(_){if(_.uniformsList===null){let A=_.currentProgram.getUniforms();_.uniformsList=Xa.seqWithValue(A.seq,_.uniforms)}return _.uniformsList}function O_(_,A){let V=Ne.get(_);V.outputColorSpace=A.outputColorSpace,V.batching=A.batching,V.batchingColor=A.batchingColor,V.instancing=A.instancing,V.instancingColor=A.instancingColor,V.instancingMorph=A.instancingMorph,V.skinning=A.skinning,V.morphTargets=A.morphTargets,V.morphNormals=A.morphNormals,V.morphColors=A.morphColors,V.morphTargetsCount=A.morphTargetsCount,V.numClippingPlanes=A.numClippingPlanes,V.numIntersection=A.numClipIntersection,V.vertexAlphas=A.vertexAlphas,V.vertexTangents=A.vertexTangents,V.toneMapping=A.toneMapping}function rC(_,A,V,F,B){A.isScene!==!0&&(A=Yn),Be.resetTextureUnits();let de=A.fog,_e=F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial?A.environment:null,le=te===null?R.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:ot.workingColorSpace,ye=F.isMeshStandardMaterial||F.isMeshLambertMaterial&&!F.envMap||F.isMeshPhongMaterial&&!F.envMap,be=M.get(F.envMap||_e,ye),ze=F.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,it=!!V.attributes.tangent&&(!!F.normalMap||F.anisotropy>0),Se=!!V.morphAttributes.position,rt=!!V.morphAttributes.normal,Ut=!!V.morphAttributes.color,bt=nr;F.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(bt=R.toneMapping);let Mt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,_n=Mt!==void 0?Mt.length:0,Ee=Ne.get(F),bn=w.state.lights;if($t===!0&&(Rn===!0||_!==J)){let Nt=_===J&&F.id===W;X.setState(F,_,Nt)}let lt=!1,ws=!1;F.version===Ee.__version?Ee.needsLights&&Ee.lightsStateVersion!==bn.state.version||B.isBatchedMesh&&Ee.batching===!1||!B.isBatchedMesh&&Ee.batching===!0||B.isBatchedMesh&&Ee.batchingColor===!0&&B._colorsTexture===null||B.isBatchedMesh&&Ee.batchingColor===!1&&B._colorsTexture!==null||B.isInstancedMesh&&Ee.instancing===!1||!B.isInstancedMesh&&Ee.instancing===!0||B.isSkinnedMesh&&Ee.skinning===!1||!B.isSkinnedMesh&&Ee.skinning===!0||B.isInstancedMesh&&Ee.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&Ee.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&Ee.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&Ee.instancingMorph===!1&&B.morphTexture!==null||Ee.envMap!==be||F.fog===!0&&Ee.fog!==de||Ee.numClippingPlanes!==void 0&&(Ee.numClippingPlanes!==X.numPlanes||Ee.numIntersection!==X.numIntersection)||Ee.vertexAlphas!==ze||Ee.vertexTangents!==it||Ee.morphTargets!==Se||Ee.morphNormals!==rt||Ee.morphColors!==Ut||Ee.morphTargetsCount!==_n||Ee.numLightProbeGrids!==N_(w.state.lightProbeGridArray)?lt=!0:(Ee.outputColorSpace!==le||Ee.toneMapping!==bt)&&(ws=!0):(lt=!0,Ee.__version=F.version);let xn=Ee.currentProgram;(lt===!0||ws===!0)&&(xn=ws===!0?iC(F,A,B,le,bt):Ka(F,A,B),U&&F.isNodeMaterial&&U.onUpdateProgram(F,xn,Ee));let eu=!1,zr=!1,Cs=!1,ct=xn.getUniforms(),cn=Ee.uniforms;if(fe.useProgram(xn.program)&&(eu=!0,zr=!0,Cs=!0),F.id!==W&&(W=F.id,zr=!0),eu||J!==_){fe.buffers.depth.getReversed()&&_.reversedDepth!==!0&&(_._reversedDepth=!0,_.updateProjectionMatrix()),ct.setValue(N,"projectionMatrix",_.projectionMatrix),ct.setValue(N,"viewMatrix",_.matrixWorldInverse);let en=ct.map.cameraPosition;en!==void 0&&en.setValue(N,Di.setFromMatrixPosition(_.matrixWorld)),Dt.logarithmicDepthBuffer&&ct.setValue(N,"logDepthBufFC",2/(Math.log(_.far+1)/Math.LN2)),(F.isMeshPhongMaterial||F.isMeshToonMaterial||F.isMeshLambertMaterial||F.isMeshBasicMaterial||F.isMeshStandardMaterial||F.isShaderMaterial)&&ct.setValue(N,"isOrthographic",_.isOrthographicCamera===!0),J!==_&&(J=_,zr=!0,Cs=!0)}if(Ee.needsLights&&(bn.state.sunShadowMap.length>0&&ct.setValue(N,"sunShadowMap",bn.state.sunShadowMap,Be),bn.state.directionalShadowMap.length>0&&ct.setValue(N,"directionalShadowMap",bn.state.directionalShadowMap,Be),bn.state.spotShadowMap.length>0&&ct.setValue(N,"spotShadowMap",bn.state.spotShadowMap,Be),bn.state.pointShadowMap.length>0&&ct.setValue(N,"pointShadowMap",bn.state.pointShadowMap,Be)),B.isSkinnedMesh){ct.setOptional(N,B,"bindMatrix"),ct.setOptional(N,B,"bindMatrixInverse");let Nt=B.skeleton;Nt&&(Nt.boneTexture===null&&Nt.computeBoneTexture(),ct.setValue(N,"boneTexture",Nt.boneTexture,Be))}B.isBatchedMesh&&(ct.setOptional(N,B,"batchingTexture"),ct.setValue(N,"batchingTexture",B._matricesTexture,Be),ct.setOptional(N,B,"batchingIdTexture"),ct.setValue(N,"batchingIdTexture",B._indirectTexture,Be),ct.setOptional(N,B,"batchingColorTexture"),B._colorsTexture!==null&&ct.setValue(N,"batchingColorTexture",B._colorsTexture,Be));let li=V.morphAttributes;if((li.position!==void 0||li.normal!==void 0||li.color!==void 0)&&Z.update(B,V,xn),(zr||Ee.receiveShadow!==B.receiveShadow)&&(Ee.receiveShadow=B.receiveShadow,ct.setValue(N,"receiveShadow",B.receiveShadow)),(F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial)&&F.envMap===null&&A.environment!==null&&(cn.envMapIntensity.value=A.environmentIntensity),cn.dfgLUT!==void 0&&(cn.dfgLUT.value=U2()),zr){if(ct.setValue(N,"toneMappingExposure",R.toneMappingExposure),Ee.needsLights&&sC(cn,Cs),de&&F.fog===!0&&se.refreshFogUniforms(cn,de),se.refreshMaterialUniforms(cn,F,ve,Re,w.state.transmissionRenderTarget[_.id]),Ee.needsLights&&Ee.numLightProbeGrids>0){let Nt=b,en=0;for(let ar of w.state.lightProbeGridArray)ar.texture!==null&&(Nt.textures[en]=ar.texture,Nt.min[en]=ar.boundingBox.min,Nt.max[en]=ar.boundingBox.max,Nt.resolution[en]=ar.resolution,en++);for(let ar in Nt)Nt[ar].length=en;cn.probesSH.value=Nt.textures,cn.probesMin.value=Nt.min,cn.probesMax.value=Nt.max,cn.probesResolution.value=Nt.resolution}Xa.upload(N,P_(Ee),cn,Be)}if(F.isShaderMaterial&&F.uniformsNeedUpdate===!0&&(Xa.upload(N,P_(Ee),cn,Be),F.uniformsNeedUpdate=!1),F.isSpriteMaterial&&ct.setValue(N,"center",B.center),ct.setValue(N,"modelViewMatrix",B.modelViewMatrix),ct.setValue(N,"normalMatrix",B.normalMatrix),ct.setValue(N,"modelMatrix",B.matrixWorld),F.uniformsGroups!==void 0){let Nt=F.uniformsGroups;for(let en=0,ar=Nt.length;en<ar;en++){let F_=Nt[en];we.update(F_,xn),we.bind(F_,xn)}}return xn}function sC(_,A){_.ambientLightColor.needsUpdate=A,_.lightProbe.needsUpdate=A,_.sunLights.needsUpdate=A,_.sunLightShadows.needsUpdate=A,_.directionalLights.needsUpdate=A,_.directionalLightShadows.needsUpdate=A,_.pointLights.needsUpdate=A,_.pointLightShadows.needsUpdate=A,_.spotLights.needsUpdate=A,_.spotLightShadows.needsUpdate=A,_.rectAreaLights.needsUpdate=A,_.hemisphereLights.needsUpdate=A}function oC(_){return _.isMeshLambertMaterial||_.isMeshToonMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isShadowMaterial||_.isShaderMaterial&&_.lights===!0}this.getActiveCubeFace=function(){return $},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return te},this.setRenderTargetTextures=function(_,A,V){let F=Ne.get(_);F.__autoAllocateDepthBuffer=_.resolveDepthBuffer===!1,F.__autoAllocateDepthBuffer===!1&&(F.__useRenderToTexture=!1),Ne.get(_.texture).__webglTexture=A,Ne.get(_.depthTexture).__webglTexture=F.__autoAllocateDepthBuffer?void 0:V,F.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(_,A){let V=Ne.get(_);V.__webglFramebuffer=A,V.__useDefaultFramebuffer=A===void 0},this.setRenderTarget=function(_,A=0,V=0){te=_,$=A,H=V;let F=null,B=!1,de=!1;if(_){let le=Ne.get(_);if(le.__useDefaultFramebuffer!==void 0){fe.bindFramebuffer(N.FRAMEBUFFER,le.__webglFramebuffer),Q.copy(_.viewport),Me.copy(_.scissor),He=_.scissorTest,fe.viewport(Q),fe.scissor(Me),fe.setScissorTest(He),W=-1;return}else if(le.__webglFramebuffer===void 0)Be.setupRenderTarget(_);else if(le.__hasExternalTextures)Be.rebindTextures(_,Ne.get(_.texture).__webglTexture,Ne.get(_.depthTexture).__webglTexture);else if(_.depthBuffer){let ze=_.depthTexture;if(le.__boundDepthTexture!==ze){if(ze!==null&&Ne.has(ze)&&(_.width!==ze.image.width||_.height!==ze.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Be.setupDepthRenderbuffer(_)}}let ye=_.texture;(ye.isData3DTexture||ye.isDataArrayTexture||ye.isCompressedArrayTexture)&&(de=!0);let be=Ne.get(_).__webglFramebuffer;_.isWebGLCubeRenderTarget?(Array.isArray(be[A])?F=be[A][V]:F=be[A],B=!0):_.samples>0&&Be.useMultisampledRTT(_)===!1?F=Ne.get(_).__webglMultisampledFramebuffer:Array.isArray(be)?F=be[V]:F=be,Q.copy(_.viewport),Me.copy(_.scissor),He=_.scissorTest}else Q.copy(Oe).multiplyScalar(ve).floor(),Me.copy(vt).multiplyScalar(ve).floor(),He=Et;if(V!==0&&(F=G),fe.bindFramebuffer(N.FRAMEBUFFER,F)&&fe.drawBuffers(_,F),fe.viewport(Q),fe.scissor(Me),fe.setScissorTest(He),B){let le=Ne.get(_.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+A,le.__webglTexture,V)}else if(de){let le=A;for(let ye=0;ye<_.textures.length;ye++){let be=Ne.get(_.textures[ye]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+ye,be.__webglTexture,V,le)}}else if(_!==null&&V!==0){let le=Ne.get(_.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,le.__webglTexture,V)}W=-1};function L_(_){let A=Ne.get(_);return(A.__readFormat!==_.format||A.__readType!==_.type)&&(A.__readFormat=_.format,A.__readType=_.type,A.__formatReadable=Dt.textureFormatReadable(_.format),A.__typeReadable=Dt.textureTypeReadable(_.type)),A}this.readRenderTargetPixels=function(_,A,V,F,B,de,_e,le=0){if(!(_&&_.isWebGLRenderTarget)){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ye=Ne.get(_).__webglFramebuffer;if(_.isWebGLCubeRenderTarget&&_e!==void 0&&(ye=ye[_e],Array.isArray(ye)&&(ye=ye[0])),ye){fe.bindFramebuffer(N.FRAMEBUFFER,ye);try{let be=_.textures[le],ze=be.format,it=be.type;_.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+le);let Se=L_(be);if(Se.__formatReadable===!1){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Se.__typeReadable===!1){Fe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}A>=0&&A<=_.width-F&&V>=0&&V<=_.height-B&&N.readPixels(A,V,F,B,ie.convert(ze),ie.convert(it),de)}finally{let be=te!==null?Ne.get(te).__webglFramebuffer:null;fe.bindFramebuffer(N.FRAMEBUFFER,be)}}},this.readRenderTargetPixelsAsync=async function(_,A,V,F,B,de,_e,le=0){if(!(_&&_.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ye=Ne.get(_).__webglFramebuffer;if(_.isWebGLCubeRenderTarget&&_e!==void 0&&(ye=ye[_e],Array.isArray(ye)&&(ye=ye[0])),ye)if(A>=0&&A<=_.width-F&&V>=0&&V<=_.height-B){fe.bindFramebuffer(N.FRAMEBUFFER,ye);let be=_.textures[le],ze=be.format,it=be.type;_.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+le);let Se=L_(be);if(Se.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Se.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let rt=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,rt),N.bufferData(N.PIXEL_PACK_BUFFER,de.byteLength,N.STREAM_READ),N.readPixels(A,V,F,B,ie.convert(ze),ie.convert(it),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let Ut=te!==null?Ne.get(te).__webglFramebuffer:null;fe.bindFramebuffer(N.FRAMEBUFFER,Ut);let bt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await dw(N,bt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,rt),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,de),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(rt),N.deleteSync(bt),de}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(_,A=null,V=0){let F=Math.pow(2,-V),B=Math.floor(_.image.width*F),de=Math.floor(_.image.height*F),_e=A!==null?A.x:0,le=A!==null?A.y:0;Be.setTexture2D(_,0),N.copyTexSubImage2D(N.TEXTURE_2D,V,0,0,_e,le,B,de),fe.unbindTexture()},this.copyTextureToTexture=function(_,A,V=null,F=null,B=0,de=0){let _e,le,ye,be,ze,it,Se,rt,Ut,bt=_.isCompressedTexture?_.mipmaps[de]:_.image;if(V!==null)_e=V.max.x-V.min.x,le=V.max.y-V.min.y,ye=V.isBox3?V.max.z-V.min.z:1,be=V.min.x,ze=V.min.y,it=V.isBox3?V.min.z:0;else{let ct=Math.pow(2,-B);_e=Math.floor(bt.width*ct),le=Math.floor(bt.height*ct),_.isDataArrayTexture?ye=bt.depth:_.isData3DTexture?ye=Math.floor(bt.depth*ct):ye=1,be=0,ze=0,it=0}F!==null?(Se=F.x,rt=F.y,Ut=F.z):(Se=0,rt=0,Ut=0);let Mt=ie.convert(A.format),_n=ie.convert(A.type),Ee;A.isData3DTexture?(Be.setTexture3D(A,0),Ee=N.TEXTURE_3D):A.isDataArrayTexture||A.isCompressedArrayTexture?(Be.setTexture2DArray(A,0),Ee=N.TEXTURE_2D_ARRAY):(Be.setTexture2D(A,0),Ee=N.TEXTURE_2D),fe.activeTexture(N.TEXTURE0),fe.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,A.flipY),fe.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),fe.pixelStorei(N.UNPACK_ALIGNMENT,A.unpackAlignment);let bn=fe.getParameter(N.UNPACK_ROW_LENGTH),lt=fe.getParameter(N.UNPACK_IMAGE_HEIGHT),ws=fe.getParameter(N.UNPACK_SKIP_PIXELS),xn=fe.getParameter(N.UNPACK_SKIP_ROWS),eu=fe.getParameter(N.UNPACK_SKIP_IMAGES);fe.pixelStorei(N.UNPACK_ROW_LENGTH,bt.width),fe.pixelStorei(N.UNPACK_IMAGE_HEIGHT,bt.height),fe.pixelStorei(N.UNPACK_SKIP_PIXELS,be),fe.pixelStorei(N.UNPACK_SKIP_ROWS,ze),fe.pixelStorei(N.UNPACK_SKIP_IMAGES,it);let zr=_.isDataArrayTexture||_.isData3DTexture,Cs=A.isDataArrayTexture||A.isData3DTexture;if(_.isDepthTexture){let ct=Ne.get(_),cn=Ne.get(A),li=Ne.get(ct.__renderTarget),Nt=Ne.get(cn.__renderTarget);fe.bindFramebuffer(N.READ_FRAMEBUFFER,li.__webglFramebuffer),fe.bindFramebuffer(N.DRAW_FRAMEBUFFER,Nt.__webglFramebuffer);for(let en=0;en<ye;en++)zr&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Ne.get(_).__webglTexture,B,it+en),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Ne.get(A).__webglTexture,de,Ut+en)),N.blitFramebuffer(be,ze,be+_e,ze+le,Se,rt,Se+_e,rt+le,N.DEPTH_BUFFER_BIT,N.NEAREST);fe.bindFramebuffer(N.READ_FRAMEBUFFER,null),fe.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(B!==0||_.isRenderTargetTexture||Ne.has(_)){let ct=Ne.get(_),cn=Ne.get(A);fe.bindFramebuffer(N.READ_FRAMEBUFFER,I),fe.bindFramebuffer(N.DRAW_FRAMEBUFFER,z);for(let li=0;li<ye;li++)zr?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ct.__webglTexture,B,it+li):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,ct.__webglTexture,B),Cs?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,cn.__webglTexture,de,Ut+li):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,cn.__webglTexture,de),B!==0?N.blitFramebuffer(be,ze,be+_e,ze+le,Se,rt,Se+_e,rt+le,N.COLOR_BUFFER_BIT,N.NEAREST):Cs?N.copyTexSubImage3D(Ee,de,Se,rt,Ut+li,be,ze,_e,le):N.copyTexSubImage2D(Ee,de,Se,rt,be,ze,_e,le);fe.bindFramebuffer(N.READ_FRAMEBUFFER,null),fe.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else Cs?_.isDataTexture||_.isData3DTexture?N.texSubImage3D(Ee,de,Se,rt,Ut,_e,le,ye,Mt,_n,bt.data):A.isCompressedArrayTexture?N.compressedTexSubImage3D(Ee,de,Se,rt,Ut,_e,le,ye,Mt,bt.data):N.texSubImage3D(Ee,de,Se,rt,Ut,_e,le,ye,Mt,_n,bt):_.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,de,Se,rt,_e,le,Mt,_n,bt.data):_.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,de,Se,rt,bt.width,bt.height,Mt,bt.data):N.texSubImage2D(N.TEXTURE_2D,de,Se,rt,_e,le,Mt,_n,bt);fe.pixelStorei(N.UNPACK_ROW_LENGTH,bn),fe.pixelStorei(N.UNPACK_IMAGE_HEIGHT,lt),fe.pixelStorei(N.UNPACK_SKIP_PIXELS,ws),fe.pixelStorei(N.UNPACK_SKIP_ROWS,xn),fe.pixelStorei(N.UNPACK_SKIP_IMAGES,eu),de===0&&A.generateMipmaps===!0&&A.mipmapsAutoUpdate===!0&&N.generateMipmap(Ee),fe.unbindTexture()},this.initRenderTarget=function(_){Ne.get(_).__webglFramebuffer===void 0&&Be.setupRenderTarget(_)},this.initTexture=function(_){_.isCubeTexture?Be.setTextureCube(_,0):_.isData3DTexture?Be.setTexture3D(_,0):_.isDataArrayTexture||_.isCompressedArrayTexture?Be.setTexture2DArray(_,0):Be.setTexture2D(_,0),fe.unbindTexture()},this.resetState=function(){$=0,H=0,te=null,fe.reset(),oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ci}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=ot._getDrawingBufferColorSpace(e),t.unpackColorSpace=ot._getUnpackColorSpace()}};var sr=n=>`${n.col},${n.row}`,Za=(n,e)=>!!n&&!!e&&n.col===e.col&&n.row===e.row;function V2(n){let e=n.col,t=n.row-(n.col-(n.col&1))/2;return{x:e,y:-e-t,z:t}}function H2(n){let e=n.x,t=n.z+(n.x-(n.x&1))/2;return{col:e,row:t}}function Jl(n,e){return{x:e*1.5*n.col,z:e*Math.sqrt(3)*(n.row+.5*(n.col&1))}}function z2(n){let e=V2(n);return[[1,-1,0],[1,0,-1],[0,1,-1],[-1,1,0],[-1,0,1],[0,-1,1]].map(([i,r,s])=>H2({x:e.x+i,y:e.y+r,z:e.z+s}))}var G2=(n,e,t)=>n.col>=0&&n.row>=0&&n.col<e&&n.row<t;function Kw(n,e,t,i,r=new Set){let s=new Map,o=sr(n),a=new Set([o]),c=[n];for(let l=1;l<=e&&c.length;l++){let u=[];for(let d of c)for(let f of z2(d)){let h=sr(f);a.has(h)||!G2(f,t,i)||r.has(h)||(a.add(h),s.set(h,{coord:f,cost:l,prev:sr(d)}),u.push(f))}c=u}return s}function Jw(n,e){let t=[],i=n.get(sr(e));for(;i;)t.unshift(i.coord),i=n.get(i.prev);return t}var Ms=1,w_=.35,Qw=.94,or={background:1191993,outline:728356,hexA:3111108,hexB:2780595,hexC:3441359,reachable:11134207,selected:16765503,activeRing:16765503,focusRing:16777215},xp=class{constructor(e,t,i,r){this.canvas=e;this.map=t;this.callbacks=r;this.renderer=new vp({canvas:e,antialias:!0}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Th,this.scene.background=new je(or.background),this.scene.fog=new El(or.background,22,48),this.setupLights(),this.buildBoard();for(let o of i)this.buildUnit(o);this.activeMarker=this.buildMarker(or.activeRing,.62,.09),this.focusMarker=this.buildMarker(or.focusRing,.72,.05);let s=i[0]?.start??{col:0,row:0};this.camTarget.copy(this.worldOf(s)),this.camGoal.copy(this.camTarget),this.paintTiles(),this.bindInput(),this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(e.parentElement??e),this.resize(),this.loop()}canvas;map;callbacks;renderer;scene=new Ml;camera=new Dn(40,1,.1,200);raycaster=new Ul;tiles=new Map;pickables=[];units=new Map;activeMarker;focusMarker;clock=new Bl;resizeObserver;frameId=0;reachable=new Set;selected=null;activeId=null;focusId=null;moving=!1;inputEnabled=!0;camTarget=new L;camGoal=new L;zoom=1;bounds={minX:0,maxX:0,minZ:0,maxZ:0};pointers=new Map;tapStart=null;dragged=!1;pinchDist=0;get busy(){return this.moving}setInputEnabled(e){this.inputEnabled=e}setActive(e){this.activeId=e}focus(e,t=!0){this.focusId=e;let i=e?this.units.get(e):void 0;i&&t&&(this.camGoal.copy(this.worldOf(i.hex)),this.clampGoal())}setReachable(e){this.reachable=new Set(e),this.paintTiles()}setSelected(e){this.selected=e,this.paintTiles()}placeUnits(e){for(let[t,i]of e){let r=this.units.get(t);if(!r)continue;r.hex=he({},i);let s=this.worldOf(i);r.group.position.x=s.x,r.group.position.z=s.z}this.focusId&&this.focus(this.focusId)}async moveUnit(e,t){let i=this.units.get(e);if(!(!i||this.moving||!t.length)){this.moving=!0,this.selected=null,this.reachable.clear(),this.paintTiles();for(let r of t)await this.hopTo(i,r),i.hex=r;this.moving=!1}}dispose(){cancelAnimationFrame(this.frameId),this.resizeObserver.disconnect(),this.unbindInput(),this.scene.traverse(e=>{let t=e;t.geometry?.dispose();let i=t.material;Array.isArray(i)?i.forEach(r=>r.dispose()):i?.dispose()}),this.renderer.dispose()}setupLights(){this.scene.add(new Ol(14677247,1718852,1.6));let e=new kl(16777215,2.2);e.position.set(-8,16,6),e.castShadow=!0,e.shadow.mapSize.set(1024,1024);let t=Math.max(this.map.cols,this.map.rows)*Ms*1.2;Object.assign(e.shadow.camera,{left:-t,right:t,top:t,bottom:-t,near:1,far:60});let i=this.boardCenter();e.position.add(i),e.target.position.copy(i),this.scene.add(e,e.target)}buildBoard(){let e=new vs(Ms*Qw,Ms*Qw,w_,6);e.rotateY(Math.PI/6),e.translate(0,-w_/2,0);let t=new Rl(e),i=new Ba({color:or.outline}),r=[or.hexA,or.hexB,or.hexC];for(let c=0;c<this.map.cols;c++)for(let l=0;l<this.map.rows;l++){let u={col:c,row:l},d=new je(r[(c*31+l*17)%3]),f=new er({color:d,roughness:.85,metalness:0}),h=new Wt(e,f),g=Jl(u,Ms);h.position.set(g.x,0,g.z),h.receiveShadow=!0,h.userData.hex=u,h.add(new Cl(t,i)),this.scene.add(h),this.pickables.push(h),this.tiles.set(sr(u),{coord:u,mesh:h,material:f,baseColor:d})}let s=Jl({col:this.map.cols-1,row:this.map.rows-1},Ms);Object.assign(this.bounds,{minX:0,maxX:s.x,minZ:0,maxZ:s.z+Ms});let o=this.boardCenter(),a=new Wt(new vo(s.x+30,s.z+30),new er({color:927792,roughness:1}));a.rotation.x=-Math.PI/2,a.position.set(o.x,-w_-.01,o.z),a.receiveShadow=!0,this.scene.add(a)}buildUnit(e){let t=new Nr,i=new je(e.color),r=new Wt(new vs(.42,.42,.14,40),new er({color:i,roughness:.5}));r.castShadow=!0;let s=i.clone().lerp(new je(16777215),.55),o=new Wt(new Va(.42,.07,12,40),new er({color:s,roughness:.4}));o.rotation.x=Math.PI/2,o.castShadow=!0;let a=new Wt(new vs(.14,.14,.16,24),new er({color:s,roughness:.4})),c=new Wt(new gs(.16,.12,.22),new er({color:s,roughness:.4}));c.position.set(0,0,.42),t.add(r,o,a,c);let l=new Wt(new vs(.62,.62,.6,12),new ps({visible:!1}));l.userData.unitId=e.id,t.add(l),this.scene.add(t);let u=new Wt(new Al(.4,32),new ps({color:0,transparent:!0,opacity:.35,depthWrite:!1}));u.rotation.x=-Math.PI/2,this.scene.add(u);let d=this.worldOf(e.start);t.position.set(d.x,.3,d.z),this.units.set(e.id,{id:e.id,hex:he({},e.start),group:t,shadow:u,hitbox:l,lift:0,hop:0})}buildMarker(e,t,i){let r=new Wt(new Va(t,i,10,48),new ps({color:e,transparent:!0,opacity:.95}));return r.rotation.x=-Math.PI/2,r.visible=!1,this.scene.add(r),r}paintTiles(){for(let[e,t]of this.tiles){let i=Za(t.coord,this.selected),r=this.reachable.has(e);t.material.color.set(i?or.selected:r?or.reachable:t.baseColor),t.material.emissive.set(i?7033344:0),t.mesh.position.y=i?.12:0}}worldOf(e){let t=Jl(e,Ms);return new L(t.x,0,t.z)}hopTo(e,t){let i=e.group.position.clone(),r=this.worldOf(t);this.camGoal.copy(r);let s=260,o=performance.now();return new Promise(a=>{let c=l=>{let u=Math.min(1,(l-o)/s),d=u<.5?2*u*u:1-(-2*u+2)**2/2;e.group.position.x=i.x+(r.x-i.x)*d,e.group.position.z=i.z+(r.z-i.z)*d,e.hop=Math.sin(Math.PI*u)*.6,u<1?requestAnimationFrame(c):(e.hop=0,a())};requestAnimationFrame(c)})}boardCenter(){let e=Jl({col:this.map.cols-1,row:this.map.rows-1},Ms);return new L(e.x/2,0,e.z/2)}resize(){let e=this.canvas.parentElement??this.canvas,t=Math.max(1,e.clientWidth),i=Math.max(1,e.clientHeight);this.renderer.setSize(t,i,!1),this.camera.aspect=t/i,this.camera.updateProjectionMatrix()}updateCamera(e){let t=1-Math.exp(-e*6);this.camTarget.lerp(this.camGoal,t);let i=this.camera.aspect<1?1/Math.max(this.camera.aspect,.45):1,r=11.5*this.zoom*Math.min(i,2.3),s=qa.degToRad(55);this.camera.position.set(this.camTarget.x,this.camTarget.y+Math.sin(s)*r,this.camTarget.z+Math.cos(s)*r);let o=this.camera.aspect<1?1.4:.3;this.camera.position.z+=o,this.camera.lookAt(this.camTarget.x,this.camTarget.y,this.camTarget.z+o)}loop=()=>{this.frameId=requestAnimationFrame(this.loop);let e=Math.min(this.clock.getDelta(),.1),t=this.clock.elapsedTime,i=Math.sin(t*2.4)*.08,r=1-Math.exp(-e*8);for(let o of this.units.values()){let a=o.id===this.activeId;o.lift+=((a?1:0)-o.lift)*r;let c=.3+o.lift*(.45+i);o.group.position.y=c+o.hop,a&&(o.group.rotation.y+=e*.8),o.shadow.position.set(o.group.position.x,.01,o.group.position.z),o.shadow.scale.setScalar(1-(c-.3+o.hop)*.6)}this.updateMarker(this.activeMarker,this.activeId,.03,1+Math.sin(t*4)*.06),this.updateMarker(this.focusMarker,this.focusId!==this.activeId?this.focusId:null,.04,1+Math.sin(t*5)*.04);let s=.12+Math.sin(t*3)*.08;for(let[o,a]of this.tiles)this.reachable.has(o)&&!Za(a.coord,this.selected)&&a.material.emissive.setRGB(s*.3,s*.6,s);this.updateCamera(e),this.renderer.render(this.scene,this.camera)};updateMarker(e,t,i,r){let s=t?this.units.get(t):void 0;e.visible=!!s,s&&(e.position.set(s.group.position.x,i,s.group.position.z),e.scale.setScalar(r))}bindInput(){this.canvas.addEventListener("pointerdown",this.onPointerDown),this.canvas.addEventListener("pointermove",this.onPointerMove),this.canvas.addEventListener("pointerup",this.onPointerUp),this.canvas.addEventListener("pointercancel",this.onPointerCancel),this.canvas.addEventListener("wheel",this.onWheel,{passive:!1})}unbindInput(){this.canvas.removeEventListener("pointerdown",this.onPointerDown),this.canvas.removeEventListener("pointermove",this.onPointerMove),this.canvas.removeEventListener("pointerup",this.onPointerUp),this.canvas.removeEventListener("pointercancel",this.onPointerCancel),this.canvas.removeEventListener("wheel",this.onWheel)}onPointerDown=e=>{this.canvas.setPointerCapture(e.pointerId),this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.pointers.size===1?(this.tapStart={x:e.clientX,y:e.clientY,t:performance.now()},this.dragged=!1):(this.tapStart=null,this.pinchDist=this.currentPinchDistance())};onPointerMove=e=>{let t=this.pointers.get(e.pointerId);if(!t)return;let i={x:e.clientX,y:e.clientY};if(this.pointers.set(e.pointerId,i),this.pointers.size>=2){let r=this.currentPinchDistance();this.pinchDist>0&&r>0&&this.setZoom(this.zoom*(this.pinchDist/r)),this.pinchDist=r;return}if(this.tapStart&&Math.hypot(i.x-this.tapStart.x,i.y-this.tapStart.y)>10&&(this.dragged=!0),this.dragged){let r=this.canvas.clientHeight||1,s=22*this.zoom/r;this.camGoal.x-=(i.x-t.x)*s,this.camGoal.z-=(i.y-t.y)*s*1.3,this.clampGoal()}};onPointerUp=e=>{let t=this.pointers.size===1&&this.tapStart&&!this.dragged&&performance.now()-this.tapStart.t<600;this.pointers.delete(e.pointerId),this.pointers.size<2&&(this.pinchDist=0),t&&this.handleTap(e.clientX,e.clientY),this.pointers.size===0&&(this.tapStart=null)};onPointerCancel=e=>{this.pointers.delete(e.pointerId),this.tapStart=null};onWheel=e=>{e.preventDefault(),this.setZoom(this.zoom*(e.deltaY>0?1.1:.9))};currentPinchDistance(){let e=[...this.pointers.values()];return e.length<2?0:Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y)}setZoom(e){this.zoom=qa.clamp(e,.55,1.8)}clampGoal(){let e=this.bounds;this.camGoal.x=qa.clamp(this.camGoal.x,e.minX,e.maxX),this.camGoal.z=qa.clamp(this.camGoal.z,e.minZ,e.maxZ)}handleTap(e,t){if(!this.inputEnabled||this.moving)return;let i=this.canvas.getBoundingClientRect(),r=new et((e-i.left)/i.width*2-1,-((t-i.top)/i.height)*2+1);this.raycaster.setFromCamera(r,this.camera);let s=[...this.units.values()].map(u=>u.hitbox),o=this.raycaster.intersectObjects(s,!1)[0];if(o){this.callbacks.onUnitTap(o.object.userData.unitId);return}let c=this.raycaster.intersectObjects(this.pickables,!1)[0]?.object.userData.hex,l=c&&[...this.units.values()].find(u=>Za(u.hex,c));l?this.callbacks.onUnitTap(l.id):this.callbacks.onHexTap(c??null)}};var j2=["board"],W2=(n,e)=>e.id;function $2(n,e){if(n&1){let t=ts();Ie(0,"button",18),Hn("click",function(){let r=Li(t).$implicit,s=Gt();return Fi(s.focusCharacter(r.id))}),Ie(1,"span",19),Je(2),ke(),Ie(3,"span",20)(4,"span",21),Je(5),ke(),Ie(6,"span",22),Je(7),ke()()()}if(n&2){let t=e.$implicit,i=Gt();ns("active",t.id===i.active().id)("focused",t.id===i.focused().id),eo("aria-pressed",t.id===i.focused().id)("aria-label",t.name+(t.id===i.active().id?", na vez":", aguardando")+". Toque para ver no tabuleiro.")("data-testid","chip-"+t.id),Ke(),no("background",i.hexColor(t)),Ke(),gn(t.initial),Ke(3),gn(t.name),Ke(2),gn(t.id===i.active().id?"Na vez":"Espera")}}function q2(n,e){if(n&1&&(Ie(0,"span",28),gr(),Ie(1,"svg",29),yi(2,"polygon",30)(3,"path",31),ke(),vr(),Ie(4,"span",32),Je(5),ke()()),n&2){let t=e.$implicit,i=e.$index;no("animation-delay",i*90,"ms"),Ke(5),gn(t)}}function X2(n,e){if(n&1&&(Je(0),Ie(1,"strong"),Je(2),ke(),Je(3," de movimento ")),n&2){let t=Gt(2);Sr(" ",t.dice().join(" + ")," = "),Ke(2),gn(t.rolled())}}function Y2(n,e){if(n&1&&Je(0),n&2){let t=Gt(2);Sr(" Rolando 2d",t.diceSides,"\u2026 ")}}function Z2(n,e){if(n&1&&(Ie(0,"div",15)(1,"div",23)(2,"span",24),Je(3),ke(),Ie(4,"div",25),Qr(5,q2,6,3,"span",26,Fd),ke(),Ie(7,"span",27),Bi(8,X2,4,2)(9,Y2,1,1),ke()()()),n&2){let t=Gt();Ke(3),Sr("Vez de ",t.active().name),Ke(),ns("rolling",t.rolled()===0),Ke(),es(t.dice()),Ke(2),ns("show",t.rolled()>0),Ke(),Vi(t.rolled()>0?8:9)}}function K2(n,e){if(n&1){let t=ts();Ie(0,"div",17)(1,"div",33)(2,"span",34),Je(3),ke(),Ie(4,"div",35)(5,"strong"),Je(6),ke(),Ie(7,"span"),Je(8),ke()()(),Ie(9,"button",36),Hn("click",function(){Li(t);let r=Gt();return Fi(r.focusCharacter(r.active().id))}),Je(10),ke()()}if(n&2){let t=Gt();Ke(2),no("background",t.hexColor(t.focused())),Ke(),gn(t.focused().initial),Ke(3),gn(t.focused().name),Ke(2),ra("Aguardando a vez \xB7 Coluna ",(t.positionOf(t.focused().id)?.col??0)+1,", linha ",(t.positionOf(t.focused().id)?.row??0)+1),Ke(2),Sr(" Voltar para ",t.active().name," ")}}function J2(n,e){n&1&&Je(0," Rolando os dados\u2026 ")}function Q2(n,e){n&1&&Je(0," Andando\u2026 ")}function eU(n,e){n&1&&Je(0," Sem movimento \xB7 passando a vez\u2026 ")}function tU(n,e){if(n&1&&Je(0),n&2){let t=Gt(3);ra(" Destino a ",t.selectedCost()," ",t.selectedCost()===1?"passo":"passos"," \xB7 toque de novo para confirmar ")}}function nU(n,e){n&1&&Je(0," Toque num hex\xE1gono claro \xB7 arraste para mover a c\xE2mera ")}function iU(n,e){if(n&1&&Bi(0,tU,1,2)(1,nU,1,0),n&2){let t=Gt(2);Vi(t.selected()?0:1)}}function rU(n,e){if(n&1&&(Ie(0,"span",28),gr(),Ie(1,"svg",29),yi(2,"polygon",30),ke(),vr(),Ie(3,"span",32),Je(4),ke()()),n&2){let t=e.$implicit,i=Gt(2);Ke(4),gn(i.phase()==="rolling"?"?":t)}}function sU(n,e){if(n&1){let t=ts();Ie(0,"button",43),Hn("click",function(){Li(t);let r=Gt(2);return Fi(r.cancel())}),Je(1,"Cancelar"),ke(),Ie(2,"button",44),Hn("click",function(){Li(t);let r=Gt(2);return Fi(r.confirm())}),Je(3,"Confirmar"),ke()}}function oU(n,e){if(n&1){let t=ts();Ie(0,"button",45),Hn("click",function(){Li(t);let r=Gt(2);return Fi(r.endTurn())}),Je(1," Passar a vez "),ke()}if(n&2){let t=Gt(2);to("disabled",t.phase()!=="moving-choice")}}function aU(n,e){if(n&1&&(Ie(0,"div",17)(1,"div",33)(2,"span",34),Je(3),ke(),Ie(4,"div",35)(5,"strong"),Je(6),ke(),Ie(7,"span",37),Bi(8,J2,1,0)(9,Q2,1,0)(10,eU,1,0)(11,iU,2,1),ke()(),Ie(12,"div",38)(13,"div",39),Qr(14,rU,5,1,"span",28,Fd),ke(),Ie(16,"span",40)(17,"strong"),Je(18),ke(),Je(19," restam"),ke()()(),Ie(20,"div",41),Bi(21,sU,4,0)(22,oU,2,1,"button",42),ke()()),n&2){let t,i=Gt();Ke(2),no("background",i.hexColor(i.active())),Ke(),gn(i.active().initial),Ke(3),Sr("Vez de ",i.active().name),Ke(2),Vi((t=i.phase())==="rolling"?8:t==="walking"?9:t==="ending"?10:11),Ke(4),eo("aria-label","Movimento restante: "+i.movesLeft()),Ke(2),es(i.dice()),Ke(4),gn(i.phase()==="rolling"?"\u2013":i.movesLeft()),Ke(3),Vi(i.selected()&&i.phase()==="moving-choice"?21:22)}}var Sp=()=>typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches,Ep=class n{router=re(qi);canvasRef=VE.required("board");board;timers=[];rollTicker;destroyed=!1;map=_f(re($i).snapshot.paramMap.get("mapId"));characters=wr;diceSides=ma.sides;positions=Xt(this.initialPositions());activeIndex=Xt(0);turn=Xt(1);phase=Xt("rolling");dice=Xt(Array(ma.count).fill(1));rolled=Xt(0);movesLeft=Xt(0);selected=Xt(null);focusedId=Xt(wr[0].id);active=Hi(()=>wr[this.activeIndex()]);focused=Hi(()=>wr.find(e=>e.id===this.focusedId())??this.active());viewingOther=Hi(()=>this.focusedId()!==this.active().id);round=Hi(()=>Math.floor((this.turn()-1)/wr.length)+1);reach=Hi(()=>{let e=this.map,t=this.positions().get(this.active().id);if(!e||!t||this.phase()!=="moving-choice")return new Map;let i=new Set([...this.positions()].filter(([r])=>r!==this.active().id).map(([,r])=>sr(r)));return Kw(t,this.movesLeft(),e.cols,e.rows,i)});selectedCost=Hi(()=>{let e=this.selected();return e?this.reach().get(sr(e))?.cost??0:0});ngAfterViewInit(){this.map&&(this.board=new xp(this.canvasRef().nativeElement,this.map,wr.map((e,t)=>({id:e.id,color:e.color,start:this.map.starts[t]})),{onHexTap:e=>this.tapHex(e),onUnitTap:e=>this.focusCharacter(e)}),this.startTurn())}ngOnDestroy(){this.destroyed=!0,this.clearTimers(),this.board?.dispose()}startTurn(){let e=this.active();this.selected.set(null),this.focusedId.set(e.id),this.board?.setActive(e.id),this.board?.focus(e.id),this.board?.setSelected(null),this.board?.setReachable([]),this.roll()}roll(){this.phase.set("rolling"),this.rolled.set(0);let e=eb(ma.count,ma.sides),t=Sp()?250:1100;this.rollTicker=setInterval(()=>this.dice.set(e.map(()=>iy(ma.sides))),Sp()?250:70),this.later(t,()=>{clearInterval(this.rollTicker),this.dice.set(e),this.rolled.set(ry(e)),this.movesLeft.set(ry(e)),this.later(Sp()?150:650,()=>this.beginChoosing())})}beginChoosing(){this.phase.set("moving-choice"),this.refreshBoard()}endTurn(){this.phase()==="walking"||this.phase()==="rolling"||(this.clearTimers(),this.phase.set("ending"),this.activeIndex.update(e=>(e+1)%wr.length),this.turn.update(e=>e+1),this.startTurn())}tapHex(e){if(this.phase()==="moving-choice"){if(this.viewingOther()&&this.focusCharacter(this.active().id),e&&this.reach().has(sr(e))){if(Za(e,this.selected())){this.confirm();return}this.selected.set(e)}else this.selected.set(null);this.board?.setSelected(this.selected())}}focusCharacter(e){this.focusedId.set(e),this.board?.focus(e),e!==this.active().id&&(this.selected.set(null),this.board?.setSelected(null))}async confirm(){let e=this.selected();if(!this.board||!e||this.phase()!=="moving-choice")return;let t=Jw(this.reach(),e);if(!t.length)return;let i=this.active().id;this.phase.set("walking"),this.selected.set(null),await this.board.moveUnit(i,t),!this.destroyed&&(this.positions.update(r=>new Map(r).set(i,e)),this.movesLeft.update(r=>r-t.length),this.movesLeft()<=0?(this.phase.set("ending"),this.later(Sp()?200:700,()=>this.endTurn())):this.beginChoosing())}cancel(){this.selected.set(null),this.board?.setSelected(null)}restart(){this.clearTimers(),this.positions.set(this.initialPositions()),this.board?.placeUnits(this.positions()),this.activeIndex.set(0),this.turn.set(1),this.startTurn()}exit(){this.router.navigate(["/"])}positionOf(e){return this.positions().get(e)}hexColor(e){return"#"+e.color.toString(16).padStart(6,"0")}refreshBoard(){this.board?.setReachable(this.reach().keys()),this.board?.setSelected(this.selected())}initialPositions(){return new Map(wr.map((e,t)=>[e.id,he({},this.map?.starts[t]??{col:0,row:0})]))}later(e,t){this.timers.push(setTimeout(t,e))}clearTimers(){this.timers.forEach(clearTimeout),this.timers=[],clearInterval(this.rollTicker)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=xr({type:n,selectors:[["app-game-screen"]],viewQuery:function(t,i){t&1&&kd(i.canvasRef,j2,5),t&2&&rv()},decls:23,vars:5,consts:[["board",""],[1,"game"],["aria-label","Tabuleiro hexagonal em 3D. Toque num hex\xE1gono azul-claro para escolher o destino e toque de novo para confirmar. Toque numa pe\xE7a para ver o personagem.",1,"board"],[1,"hud-top"],[1,"top-row"],["type","button","aria-label","Voltar ao in\xEDcio",1,"btn","btn-ghost","back",3,"click"],["viewBox","0 0 24 24","aria-hidden","true"],["d","M15 5l-7 7 7 7"],[1,"mission"],[1,"mission-name"],["data-testid","turn",1,"mission-sub"],["type","button","aria-label","Recome\xE7ar a partida",1,"btn","btn-ghost","restart",3,"click"],["d","M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"],["aria-label","Personagens",1,"roster"],["type","button",1,"chip",3,"active","focused"],["role","status","aria-live","polite","data-testid","roll",1,"roll-stage"],[1,"hud-bottom"],["data-testid","panel",1,"panel"],["type","button",1,"chip",3,"click"],[1,"portrait"],[1,"chip-text"],[1,"chip-name"],[1,"chip-state"],[1,"roll-card"],[1,"roll-who"],[1,"dice","big"],[1,"d4",3,"animation-delay"],[1,"roll-total"],[1,"d4"],["viewBox","0 0 100 92","aria-hidden","true"],["points","50,4 96,88 4,88"],["d","M50 4V62L4 88M50 62L96 88"],[1,"d4-value"],[1,"panel-head"],[1,"portrait","sm"],[1,"panel-title"],["type","button",1,"btn","btn-primary",3,"click"],["role","status","aria-live","polite","data-testid","hint"],["data-testid","moves",1,"moves"],[1,"dice","small"],[1,"moves-left"],[1,"buttons"],["type","button",1,"btn","btn-ghost",3,"disabled"],["type","button",1,"btn","btn-ghost",3,"click"],["type","button",1,"btn","btn-primary","confirm",3,"click"],["type","button",1,"btn","btn-ghost",3,"click","disabled"]],template:function(t,i){t&1&&(Ie(0,"div",1),yi(1,"canvas",2,0),Ie(3,"header",3)(4,"div",4)(5,"button",5),Hn("click",function(){return i.exit()}),gr(),Ie(6,"svg",6),yi(7,"path",7),ke()(),vr(),Ie(8,"div",8)(9,"span",9),Je(10),ke(),Ie(11,"span",10),Je(12),ke()(),Ie(13,"button",11),Hn("click",function(){return i.restart()}),gr(),Ie(14,"svg",6),yi(15,"path",12),ke()()(),vr(),Ie(16,"nav",13),Qr(17,$2,8,12,"button",14,W2),ke()(),Bi(19,Z2,10,6,"div",15),Ie(20,"footer",16),Bi(21,K2,11,7,"div",17)(22,aU,23,8,"div",17),ke()()),t&2&&(Ke(10),gn(i.map?.name),Ke(2),ra("Rodada ",i.round()," \xB7 Turno ",i.turn()),Ke(5),es(i.characters),Ke(2),Vi(i.phase()==="rolling"?19:-1),Ke(2),Vi(i.viewingOther()?21:22))},styles:["[_nghost-%COMP%]{display:block}.game[_ngcontent-%COMP%]{position:fixed;inset:0;overflow:hidden;background:var(--%NS%bg)}.board[_ngcontent-%COMP%]{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}.hud-top[_ngcontent-%COMP%]{position:absolute;top:calc(10px + var(--%NS%safe-top));left:calc(10px + var(--%NS%safe-left));right:calc(10px + var(--%NS%safe-right));display:flex;flex-direction:column;gap:8px;pointer-events:none}.hud-top[_ngcontent-%COMP%] > *[_ngcontent-%COMP%]{pointer-events:auto}.top-row[_ngcontent-%COMP%]{display:flex;align-items:center;gap:10px}.back[_ngcontent-%COMP%], .restart[_ngcontent-%COMP%]{width:52px;padding:0;display:grid;place-items:center;flex:none}.back[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%], .restart[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.restart[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{stroke-width:3}.mission[_ngcontent-%COMP%], .panel[_ngcontent-%COMP%], .roll-card[_ngcontent-%COMP%], .chip[_ngcontent-%COMP%]{background:var(--%NS%panel);border:4px solid var(--%NS%ink);border-radius:16px}.mission[_ngcontent-%COMP%]{flex:1;min-width:0;padding:6px 12px;display:flex;flex-direction:column}.mission-name[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mission-sub[_ngcontent-%COMP%]{color:var(--%NS%muted);font-size:12px}.roster[_ngcontent-%COMP%]{display:flex;gap:8px;max-width:560px}.chip[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;min-height:52px;padding:4px 8px 4px 4px;color:var(--%NS%text);text-align:left;opacity:.72;transition:transform .15s,opacity .15s,background .15s,border-color .15s}.chip.active[_ngcontent-%COMP%]{opacity:1;background:#1f4a56;border-color:var(--%NS%yellow);box-shadow:0 0 0 3px var(--%NS%ink),0 4px 0 3px var(--%NS%ink)}.chip.focused[_ngcontent-%COMP%]:not(.active){opacity:1;border-color:#fff}.chip[_ngcontent-%COMP%]:active{transform:scale(.96)}.chip-text[_ngcontent-%COMP%]{display:flex;flex-direction:column;line-height:1.1;min-width:0}.chip-name[_ngcontent-%COMP%], .chip-state[_ngcontent-%COMP%]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chip-name[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-size:16px}.chip-state[_ngcontent-%COMP%]{font-size:11px;color:var(--%NS%muted);text-transform:uppercase;letter-spacing:.4px}.chip.active[_ngcontent-%COMP%]   .chip-state[_ngcontent-%COMP%]{color:var(--%NS%yellow)}.portrait[_ngcontent-%COMP%]{width:38px;height:38px;flex:none;border-radius:50%;border:3px solid var(--%NS%ink);display:grid;place-items:center;font-family:var(--%NS%display);font-size:20px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)}.chip.active[_ngcontent-%COMP%]   .portrait[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_pulse 1.4s ease-in-out infinite}.portrait.sm[_ngcontent-%COMP%]{width:42px;height:42px}.hud-bottom[_ngcontent-%COMP%]{position:absolute;left:calc(10px + var(--%NS%safe-left));right:calc(10px + var(--%NS%safe-right));bottom:calc(12px + var(--%NS%safe-bottom));max-width:560px;margin:0 auto}.panel[_ngcontent-%COMP%]{padding:10px;display:flex;flex-direction:column;gap:10px}.panel-head[_ngcontent-%COMP%]{display:flex;align-items:center;gap:10px}.panel-title[_ngcontent-%COMP%]{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.panel-title[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-weight:400;font-size:20px}.panel-title[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{color:var(--%NS%muted);font-size:13px}.moves[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;gap:2px;flex:none}.moves-left[_ngcontent-%COMP%]{font-size:11px;color:var(--%NS%muted);text-transform:uppercase;letter-spacing:.4px}.moves-left[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-weight:400;font-size:18px;color:var(--%NS%yellow)}.buttons[_ngcontent-%COMP%]{display:flex;gap:10px}.buttons[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{flex:1}.confirm[_ngcontent-%COMP%]{flex:2!important}.dice[_ngcontent-%COMP%]{display:flex;gap:6px;justify-content:center}.d4[_ngcontent-%COMP%]{position:relative;display:grid;place-items:center}.d4[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%]{display:block;width:100%;height:100%}.d4[_ngcontent-%COMP%]   polygon[_ngcontent-%COMP%]{fill:var(--%NS%yellow);stroke:var(--%NS%ink);stroke-width:7;stroke-linejoin:round}.d4[_ngcontent-%COMP%]   path[_ngcontent-%COMP%]{fill:none;stroke:#0b1d2459;stroke-width:4;stroke-linejoin:round}.d4-value[_ngcontent-%COMP%]{position:absolute;left:0;right:0;top:46%;text-align:center;font-family:var(--%NS%display);color:var(--%NS%dark-text)}.dice.small[_ngcontent-%COMP%]   .d4[_ngcontent-%COMP%]{width:30px;height:28px}.dice.small[_ngcontent-%COMP%]   .d4-value[_ngcontent-%COMP%]{font-size:14px;top:40%}.dice.big[_ngcontent-%COMP%]{gap:18px;margin:26px 0 10px}.dice.big[_ngcontent-%COMP%]   .d4[_ngcontent-%COMP%]{width:96px;height:88px;filter:drop-shadow(0 6px 0 var(--%NS%ink))}.dice.big[_ngcontent-%COMP%]   .d4-value[_ngcontent-%COMP%]{font-size:38px;top:38%}.dice.big[_ngcontent-%COMP%]:not(.rolling)   .d4[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_land .45s cubic-bezier(.3,1.6,.5,1) both}.dice.big.rolling[_ngcontent-%COMP%]   .d4[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_tumble .42s linear infinite}.roll-stage[_ngcontent-%COMP%]{position:absolute;inset:0;display:grid;place-items:center;padding:16px;pointer-events:none;background:radial-gradient(circle,#0b1d248c,#0b1d2426 70%);animation:_ngcontent-%COMP%_fade-in .2s ease-out both}.roll-card[_ngcontent-%COMP%]{padding:14px 22px 16px;text-align:center;box-shadow:0 6px 0 var(--%NS%ink);display:flex;flex-direction:column;align-items:center}.roll-who[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-size:26px;color:var(--%NS%yellow)}.roll-total[_ngcontent-%COMP%]{color:var(--%NS%muted);font-size:15px;min-height:22px}.roll-total.show[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_land .35s ease-out both}.roll-total[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{font-family:var(--%NS%display);font-weight:400;font-size:22px;color:#fff}@keyframes _ngcontent-%COMP%_tumble{0%{transform:translateY(0) rotate(0) scale(1)}25%{transform:translateY(-22px) rotate(100deg) scale(1.08)}50%{transform:translateY(0) rotate(200deg) scale(.94)}75%{transform:translateY(-12px) rotate(290deg) scale(1.04)}to{transform:translateY(0) rotate(360deg) scale(1)}}@keyframes _ngcontent-%COMP%_land{0%{transform:translateY(-14px) scale(1.25)}to{transform:translateY(0) scale(1)}}@keyframes _ngcontent-%COMP%_pulse{0%,to{box-shadow:0 0 #ffd23fe6}50%{box-shadow:0 0 0 5px #ffd23f00}}@keyframes _ngcontent-%COMP%_fade-in{0%{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.dice.big.rolling[_ngcontent-%COMP%]   .d4[_ngcontent-%COMP%], .chip.active[_ngcontent-%COMP%]   .portrait[_ngcontent-%COMP%]{animation:none}}@media(max-width:400px){.chip[_ngcontent-%COMP%]{padding-right:6px;gap:6px}.chip-name[_ngcontent-%COMP%]{font-size:14px}.chip-state[_ngcontent-%COMP%]{font-size:10px}.portrait[_ngcontent-%COMP%]{width:34px;height:34px;font-size:18px}.mission-name[_ngcontent-%COMP%]{font-size:17px}.dice.big[_ngcontent-%COMP%]   .d4[_ngcontent-%COMP%]{width:80px;height:74px}}"]})};var cU=n=>_f(n.paramMap.get("mapId"))?!0:re(qi).createUrlTree(["/"]),eC=[{path:"",component:xf,title:"Jogo do Ibama"},{path:"jogo/:mapId",component:Ep,canActivate:[cU],title:"Jogo do Ibama \xB7 Partida"},{path:"**",redirectTo:""}];var tC={providers:[$m(),ey(eC,ty())]};var Mp=class n{static \u0275fac=function(t){return new(t||n)};static \u0275cmp=xr({type:n,selectors:[["app-root"]],decls:1,vars:0,template:function(t,i){t&1&&ia(0,"router-outlet")},dependencies:[ol],encapsulation:2})};bv(Mp,tC).catch(n=>console.error(n));
