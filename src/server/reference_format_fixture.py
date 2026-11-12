import ast,json,re,sys
from pathlib import Path
source=Path(sys.argv[1]).read_text(encoding="utf-8")
resume=json.load(sys.stdin)
names={"format_education","format_experience","format_projects"}
functions=[node for node in ast.parse(source).body if isinstance(node,ast.FunctionDef) and node.name in names]
template_node=next((node for node in ast.parse(source).body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=="RESUME_TEX_TEMPLATE" for target in node.targets)),None)
def escape(value):
    replacements={"\\":r"\textbackslash{}","&":r"\&","%":r"\%","$":r"\$","#":r"\#","_":r"\_","{":r"\{","}":r"\}","~":r"\textasciitilde{}","^":r"\textasciicircum{}"}
    return "".join(replacements.get(c,c) for c in str(value))
ns={"re":re,"latex_escape":escape,"normalize_location_city_state_country":lambda s:s,"_education_gpa":lambda e:e.get("gpa",""),"highlight_keywords_latex":lambda s:s,"auto_linkify_latex":lambda s:s,"_one_line_bullet":lambda s:s,"MAX_PROJECT_BULLETS":100,"MAX_EXPERIENCE_BULLETS":100,"_collapse_adjacent_word_repeats":lambda s:s,"split_company_and_location":lambda c:(c,"")}
exec(compile(ast.Module(body=functions,type_ignores=[]),"reference-formatters","exec"),ns)
result={name:ns[name](resume.get(key,[])) for name,key in [("format_education","education"),("format_experience","experience"),("format_projects","projects")]}
result["resume_template"]=ast.literal_eval(template_node.value) if template_node else ""
print(json.dumps(result))
