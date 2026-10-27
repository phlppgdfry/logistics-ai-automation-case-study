// Sets the current value of an environment variable, e.g. node set-env.mjs crl_Mode off
import { get, post, patch } from "./dv.mjs";
const [schema, value] = process.argv.slice(2);
const o = { solution: null };
const def = (await get(`environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq '${schema}'`, o)).json.value[0];
const cur = (await get(`environmentvariablevalues?$select=environmentvariablevalueid&$filter=_environmentvariabledefinitionid_value eq ${def.environmentvariabledefinitionid}`, o)).json.value[0];
if (cur) await patch(`environmentvariablevalues(${cur.environmentvariablevalueid})`, { value }, o);
else await post("environmentvariablevalues", { schemaname: `${schema}_value`, value, "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${def.environmentvariabledefinitionid})` }, o); // values stay out of the solution
console.log(`${schema} = ${value}`);
