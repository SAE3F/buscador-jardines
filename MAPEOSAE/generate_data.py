import pandas as pd
import json
import os

f_coords = 'Listado escuelas - Coordenadas - relevamiento_educacion (1).xlsx'
f_sae = 'SAE_ Tablero Gestión - CUPOS 2026.xlsx'

df1 = pd.read_excel(f_coords)
df2 = pd.read_excel(f_sae, header=None)

# 1. Parse SAE rows
sae_records = {}
for r in range(2, 265):
    raw_esc = str(df2.iloc[r, 0]).strip()
    norm_key = raw_esc.upper()
    nom_pba = str(df2.iloc[r, 1]).strip() if pd.notnull(df2.iloc[r, 1]) else ''
    srv = str(df2.iloc[r, 2]).strip()
    prov = str(df2.iloc[r, 3]).strip()
    cupo_esp = df2.iloc[r, 4]
    
    last_d = None
    last_v = None
    for c in range(5, 245):
        val = df2.iloc[r, c]
        if pd.notnull(val) and str(val).strip() != '':
            last_d = str(df2.iloc[1, c])[:10]
            last_v = val
            
    cupo_num = 0
    try:
        cupo_num = int(last_v)
    except:
        try:
            cupo_num = int(float(last_v))
        except:
            cupo_num = str(last_v)
            
    if norm_key not in sae_records:
        sae_records[norm_key] = {
            'raw_name': raw_esc,
            'nomenclatura_pba': nom_pba,
            'services': []
        }
    sae_records[norm_key]['services'].append({
        'servicio': srv,
        'proveedor': prov,
        'cupo': cupo_num,
        'fecha': last_d,
        'cupo_especial': int(cupo_esp) if pd.notnull(cupo_esp) and str(cupo_esp).isdigit() else 0
    })

alias_to_sae = {
    'ESTETICA': 'EST 01',
    'JM ARDILLITAS TRAVIESAS': 'JM ARDILLITAS',
}

special_sae = {
    'CATDI': {
        'parent_school': 'TEC 1',
        'display_name': 'CATDI (Atención Temprana del Desarrollo Infantil)',
        'nivel': 'ESPECIAL',
        'gestion': 'PBA'
    },
    'EE 502 (ANEXO)': {
        'parent_school': 'EE 502',
        'display_name': 'EE 502 (ANEXO)',
        'nivel': 'ESPECIAL',
        'gestion': 'PBA'
    },
    'CENTRO INFANTO JUVENIL ESPERANZA': {
        'parent_school': 'UDI MI NUEVA ESPERANZA',
        'display_name': 'CENTRO INFANTO JUVENIL ESPERANZA',
        'nivel': 'DISPOSITIVO',
        'gestion': 'MUNICIPAL'
    }
}

schools = []
matched_sae_keys = set()

for idx, r in df1.iterrows():
    esc_raw = str(r['ESCUELA']).strip() if pd.notnull(r['ESCUELA']) else f'Escuela_{idx}'
    esc_norm = esc_raw.upper()
    cue = str(r['cueanexo']).strip() if pd.notnull(r['cueanexo']) else ''
    nombre = str(r['NOMBRE']).strip() if pd.notnull(r['NOMBRE']) and str(r['NOMBRE']) != 'nan' else ''
    nivel = str(r['NIVEL']).strip() if pd.notnull(r['NIVEL']) else 'OTRO'
    direccion = str(r.iloc[4]).strip() if pd.notnull(r.iloc[4]) else ''
    x = r['X']
    y = r['Y']
    has_coords = pd.notnull(x) and pd.notnull(y)
    gestion = str(r.iloc[8]).strip() if pd.notnull(r.iloc[8]) else ''
    turno = str(r.iloc[9]).strip() if pd.notnull(r.iloc[9]) and str(r.iloc[9]) != 'nan' else ''
    contacto = str(r.iloc[7]).strip() if pd.notnull(r.iloc[7]) and str(r.iloc[7]) != 'nan' else ''
    
    sae_key = None
    if esc_norm in sae_records:
        sae_key = esc_norm
    elif esc_norm in alias_to_sae and alias_to_sae[esc_norm] in sae_records:
        sae_key = alias_to_sae[esc_norm]
        
    srv_list = []
    has_sae = False
    provider = ''
    total_cupos = 0
    if sae_key:
        matched_sae_keys.add(sae_key)
        has_sae = True
        srv_list = sae_records[sae_key]['services']
        if srv_list:
            provider = srv_list[0]['proveedor']
            total_cupos = sum(s['cupo'] for s in srv_list if isinstance(s['cupo'], int))
            
    schools.append({
        'id': f'esc_{idx}',
        'cueanexo': cue,
        'escuela': esc_raw,
        'nombre': nombre,
        'nivel': nivel,
        'direccion': direccion,
        'lat': float(y) if has_coords else None,
        'lng': float(x) if has_coords else None,
        'has_coords': has_coords,
        'gestion': gestion,
        'turno': turno,
        'contacto': contacto,
        'has_sae': has_sae,
        'proveedor': provider if has_sae else 'Sin SAE',
        'total_cupos': total_cupos,
        'servicios': srv_list
    })

for spec_key, spec_info in special_sae.items():
    if spec_key in sae_records:
        matched_sae_keys.add(spec_key)
        parent = next((s for s in schools if s['escuela'].upper() == spec_info['parent_school']), None)
        srv_list = sae_records[spec_key]['services']
        prov = srv_list[0]['proveedor'] if srv_list else ''
        tot_c = sum(s['cupo'] for s in srv_list if isinstance(s['cupo'], int))
        
        schools.append({
            'id': f'spec_{len(schools)}',
            'cueanexo': parent['cueanexo'] if parent else '',
            'escuela': spec_info['display_name'],
            'nombre': '',
            'nivel': spec_info['nivel'],
            'direccion': parent['direccion'] if parent else '',
            'lat': parent['lat'] if parent else None,
            'lng': parent['lng'] if parent else None,
            'has_coords': parent['has_coords'] if parent else False,
            'gestion': spec_info['gestion'],
            'turno': parent['turno'] if parent else '',
            'contacto': parent['contacto'] if parent else '',
            'has_sae': True,
            'proveedor': prov,
            'total_cupos': tot_c,
            'servicios': srv_list,
            'parent_school': spec_info['parent_school']
        })

# Filtrar para conservar EXCLUSIVAMENTE las escuelas con SAE según requerimiento
schools = [s for s in schools if s['has_sae']]

# Compute summary
all_providers = sorted(list(set(s['proveedor'] for s in schools)))
all_services = sorted(list(set(srv['servicio'] for s in schools for srv in s['servicios'])))
all_niveles = sorted(list(set(s['nivel'] for s in schools)))

provider_stats = {}
for p in all_providers:
    p_schools = [s for s in schools if s['proveedor'] == p]
    p_cupos = sum(s['total_cupos'] for s in p_schools)
    provider_stats[p] = {
        'escuelas': len(p_schools),
        'cupos': p_cupos
    }

summary = {
    'total_escuelas': len(schools),
    'con_coordenadas': sum(1 for s in schools if s['has_coords']),
    'total_cupos_sae': sum(s['total_cupos'] for s in schools),
    'total_prestaciones': sum(len(s['servicios']) for s in schools),
    'proveedores': all_providers,
    'servicios': all_services,
    'niveles': all_niveles,
    'stats_proveedores': provider_stats
}

# Output JS
js_content = f"const ESCUELAS_DATA = {json.dumps(schools, ensure_ascii=False, indent=2)};\n\nconst RESUMEN_DATA = {json.dumps(summary, ensure_ascii=False, indent=2)};\n"

with open('data_escuelas.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Output JSON
data_package = {
    'resumen': summary,
    'escuelas': schools
}
with open('data_escuelas.json', 'w', encoding='utf-8') as f:
    json.dump(data_package, f, ensure_ascii=False, indent=2)

print('Generated data_escuelas.js and data_escuelas.json successfully!')
print('Summary:', json.dumps(summary, indent=2))
