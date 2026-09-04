const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = require('path').join(__dirname, '..');
const sandbox = {};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.console = console;
sandbox.document = {
  createElement: function(t){ return { style:{}, getContext:function(){return null;}, appendChild(){}, setAttribute(){} }; },
  createElementNS: function(ns,t){ return { style:{}, getContext:function(){return null;} }; },
  addEventListener(){}, body:{ appendChild(){}, style:{} },
  getElementById(){ return null; }, querySelector(){ return null; }
};
sandbox.navigator = { userAgent: 'node' };
sandbox.performance = { now: () => Date.now() };
sandbox.requestAnimationFrame = function(){ return 0; };
sandbox.cancelAnimationFrame = function(){};
sandbox.addEventListener = function(){};
vm.createContext(sandbox);
function load(rel){
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, sandbox, { filename: rel });
}
module.exports = { sandbox, load, ROOT };
