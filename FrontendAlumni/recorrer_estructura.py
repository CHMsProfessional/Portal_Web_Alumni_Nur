import os
import json
import re

# ============================================
# CONFIGURACIÓN EDITABLE
# ============================================
# Si es True, incluye el contenido de archivos relevantes en el output
INCLUIR_CONTENIDO_ARCHIVOS = True

# Extensiones de archivos cuyo contenido se incluirá (solo si INCLUIR_CONTENIDO_ARCHIVOS = True)
EXTENSIONES_CONTENIDO = {
    '.tsx', '.ts', '.jsx', '.js', '.txt',
    '.json', '.css',
    '.py',  '.env'
}

# Nombre base del archivo de salida (sin extensión)
NOMBRE_ARCHIVO_SALIDA = "estructura_src_PortalWebAlumniReact"

# Carpeta donde se guardará el archivo de salida.
# Puedes cambiarla por cualquier otra ruta en tu equipo.
RUTA_SALIDA = r"C:\Users\crist\OneDrive\Escritorio\root"
# ============================================

# Carpetas a ignorar
CARPETAS_IGNORADAS = {
    'venv', '.venv',
    'node_modules',
    '__pycache__',
    '.git', '.svn',
    'dist', 'build',
    '.pytest_cache', '.mypy_cache',
    '.idea', '.vscode'
}

# Archivos específicos a ignorar
ARCHIVOS_IGNORADOS = {
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'recorrer_estructura.py',
    f'{NOMBRE_ARCHIVO_SALIDA}.txt'
}


def obtener_estructura(ruta):
    estructura = {}
    for nombre in sorted(os.listdir(ruta)):
        if nombre in CARPETAS_IGNORADAS:
            continue
        ruta_completa = os.path.join(ruta, nombre)
        if os.path.isdir(ruta_completa):
            estructura[nombre] = obtener_estructura(ruta_completa)
        else:
            # Ignorar archivos específicos
            if nombre in ARCHIVOS_IGNORADOS:
                continue
            if "__archivos__" not in estructura:
                estructura["__archivos__"] = []
            estructura["__archivos__"].append(nombre)
    return estructura


def obtener_lista_archivos(ruta_base):
    archivos = []
    extensiones = (
        ".html", ".js", ".mjs", ".cjs", ".css", ".json",
        ".ts", ".tsx", ".jsx",
        ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".bmp",
        ".mp3", ".wav", ".ogg"
    )
    for root, dirs, files in os.walk(ruta_base):
        # Filtrar carpetas ignoradas
        dirs[:] = [d for d in dirs if d not in CARPETAS_IGNORADAS]
        for file in files:
            # Ignorar archivos específicos
            if file in ARCHIVOS_IGNORADOS:
                continue
            if file.endswith(extensiones):
                rel_path = os.path.relpath(os.path.join(root, file), ruta_base).replace("\\", "/")
                archivos.append({
                    "ruta": rel_path,
                    "usado_por": []
                })
    return archivos


def buscar_imports_en_archivo(ruta_base, archivo):
    ruta_archivo = os.path.join(ruta_base, archivo)
    try:
        with open(ruta_archivo, encoding="utf-8") as f:
            contenido = f.read()
    except Exception:
        return []
    imports = []
    # import ... from '...'
    imports += re.findall(r"import[^;]*from\s+[\"\'](.+?)[\"\']", contenido)
    # import '...'
    imports += re.findall(r"import\s+[\"\'](.+?)[\"\']", contenido)
    # @import '...'
    imports += re.findall(r"@import\s+[\"\'](.+?)[\"\']", contenido)
    # dynamic import: import('...')
    imports += re.findall(r"import\s*\(\s*[\"\'](.+?)[\"\']\s*\)", contenido)
    # import imagen from '...'
    imports += re.findall(
        r"import\s+\w+\s+from\s+[\"\'](.+?\.(?:png|jpg|jpeg|svg|gif|webp|bmp))[\"\']",
        contenido
    )
    # assets in HTML: src="..." or href="..."
    imports += re.findall(r"\b(?:src|href)=[\"\'](.+?)[\"\']", contenido)
    return imports


def normalizar_import(ruta_import, archivo_origen, archivos_lista):
    if ruta_import.startswith("http") or ruta_import.startswith("//"):
        return None
    if ruta_import.startswith("#") or ruta_import.startswith("data:"):
        return None

    # Si es relativo, resolverlo
    if ruta_import.startswith("."):
        base_dir = os.path.dirname(archivo_origen)
        ruta_rel = os.path.normpath(os.path.join(base_dir, ruta_import)).replace("\\", "/")
        # Buscar archivo con extension
        for ext in [
            ".html", ".js", ".mjs", ".cjs", ".css", ".json",
            ".ts", ".tsx", ".jsx",
            ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".bmp",
            ".mp3", ".wav", ".ogg"
        ]:
            candidato = ruta_rel + ext
            if any(a["ruta"] == candidato for a in archivos_lista):
                return candidato
        # Si ya tiene extension
        if any(a["ruta"] == ruta_rel for a in archivos_lista):
            return ruta_rel
    else:
        # Si es import absoluto dentro del proyecto
        if any(a["ruta"] == ruta_import for a in archivos_lista):
            return ruta_import
    return None


def construir_dependencias(ruta_base, archivos_lista):
    rutas = [a["ruta"] for a in archivos_lista]
    for archivo_obj in archivos_lista:
        imports = buscar_imports_en_archivo(ruta_base, archivo_obj["ruta"])
        for imp in imports:
            ruta_importada = normalizar_import(imp, archivo_obj["ruta"], archivos_lista)
            if ruta_importada and ruta_importada in rutas:
                for destino in archivos_lista:
                    if destino["ruta"] == ruta_importada:
                        if archivo_obj["ruta"] not in destino["usado_por"]:
                            destino["usado_por"].append(archivo_obj["ruta"])
    return archivos_lista


def leer_contenido_archivo(ruta_base, ruta_relativa):
    """Lee y retorna el contenido de un archivo."""
    ruta_completa = os.path.join(ruta_base, ruta_relativa)
    try:
        with open(ruta_completa, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"[Error al leer archivo: {e}]"


def imprimir_guiones_con_usado_por(estructura, ruta_actual, nivel, archivos_lista, ruta_base="."):
    resultado = ""
    archivos_raiz_exentos = {
        "main.tsx", "App.tsx", "index.tsx", "index.js", "index.ts", "main.js", "App.js"
    }
    for clave, valor in estructura.items():
        if clave == "__archivos__":
            for archivo in valor:
                ruta_relativa = (ruta_actual + "/" + archivo).lstrip("/").replace("\\", "/")
                if nivel == 0 and archivo in archivos_raiz_exentos:
                    resultado += "\t" * nivel + f"- {archivo}\n"
                    continue
                obj = next((a for a in archivos_lista if a["ruta"] == ruta_relativa), None)
                usados_por = obj["usado_por"] if obj else []
                if usados_por:
                    usados_por_str = f" (importado por {', '.join(usados_por)})"
                else:
                    usados_por_str = " (NO ES USADO EN NINGUN LADO)"
                resultado += "\t" * nivel + f"- {archivo}{usados_por_str}\n"
                
                # Si está activado, incluir contenido del archivo
                if INCLUIR_CONTENIDO_ARCHIVOS and any(archivo.endswith(ext) for ext in EXTENSIONES_CONTENIDO):
                    contenido = leer_contenido_archivo(ruta_base, ruta_relativa)
                    if contenido:
                        resultado += "\n" + "="*80 + "\n"
                        resultado += f"CONTENIDO DE: {ruta_relativa}\n"
                        resultado += "="*80 + "\n"
                        resultado += contenido
                        resultado += "\n" + "="*80 + "\n\n"
        else:
            resultado += "\t" * nivel + f"- {clave}\n"
            resultado += imprimir_guiones_con_usado_por(
                valor,
                ruta_actual + "/" + clave if ruta_actual else clave,
                nivel + 1,
                archivos_lista,
                ruta_base
            )
    return resultado


def main():
    ruta_base = os.environ.get("RUTA_BASE", ".")
    ruta_salida = os.environ.get("RUTA_SALIDA", RUTA_SALIDA)

    if not os.path.isdir(ruta_base):
        print(f"Ruta no encontrada: {ruta_base}")
        return

    # Crear carpeta destino si no existe
    os.makedirs(ruta_salida, exist_ok=True)

    archivo_salida = os.path.join(ruta_salida, f"{NOMBRE_ARCHIVO_SALIDA}.txt")

    estructura_src = obtener_estructura(ruta_base)
    archivos_lista = obtener_lista_archivos(ruta_base)
    archivos_lista = construir_dependencias(ruta_base, archivos_lista)

    with open(archivo_salida, "w", encoding="utf-8") as f:
        def imprimir_guiones(estructura, nivel=0):
            resultado = ""
            for clave, valor in estructura.items():
                if clave == "__archivos__":
                    for archivo in valor:
                        resultado += "\t" * nivel + f"- {archivo}\n"
                else:
                    resultado += "\t" * nivel + f"- {clave}\n"
                    resultado += imprimir_guiones(valor, nivel + 1)
            return resultado

        # Escribir guía de interpretación
        guia = """
================================================================================
                    GUÍA DE INTERPRETACIÓN DEL DOCUMENTO
================================================================================

Este documento contiene tres secciones principales que analizan la estructura
del proyecto y las dependencias entre archivos:

────────────────────────────────────────────────────────────────────────────────
SECCIÓN 1: Estructura en guiones
────────────────────────────────────────────────────────────────────────────────
Muestra la estructura de carpetas y archivos del proyecto de forma jerárquica.
Cada nivel de indentación (tabulación) representa un nivel de profundidad en
la jerarquía de directorios.

Ejemplo:
  - src/
      - components/
          - Header.tsx
          - Footer.tsx

────────────────────────────────────────────────────────────────────────────────
SECCIÓN 2: Estructura en JSON
────────────────────────────────────────────────────────────────────────────────
Representa la misma estructura en formato JSON, útil para procesamiento
automático o análisis programático de la estructura del proyecto.

────────────────────────────────────────────────────────────────────────────────
SECCIÓN 3: Estructura con análisis de dependencias
────────────────────────────────────────────────────────────────────────────────
La sección más detallada. Para cada archivo muestra:

• (importado por X, Y, Z) - Indica qué archivos utilizan/importan este archivo.
  Útil para entender el impacto de cambios en un archivo.

• (NO ES USADO EN NINGUN LADO) - Archivo que no es importado por ningún otro.
  Podría ser un archivo huérfano/sin uso, o un punto de entrada (entry point).

• Archivos exentos de análisis: Los archivos raíz como main.tsx, App.tsx,
  index.js, etc., no muestran anotaciones porque son puntos de entrada.

"""
        if INCLUIR_CONTENIDO_ARCHIVOS:
            guia += """────────────────────────────────────────────────────────────────────────────────
MODO ACTIVO: Incluye contenido de archivos
────────────────────────────────────────────────────────────────────────────────
Después de cada archivo relevante (.tsx, .ts, .jsx, .js, .json, .py), se
incluye su contenido completo delimitado por líneas de igual (====).

Formato:
  ================================================================================
  CONTENIDO DE: ruta/del/archivo.tsx
  ================================================================================
  [contenido del archivo aquí]
  ================================================================================

"""
        guia += """────────────────────────────────────────────────────────────────────────────────
ARCHIVOS Y CARPETAS EXCLUIDOS DEL ANÁLISIS
────────────────────────────────────────────────────────────────────────────────
El script ignora automáticamente:
  • Carpetas: node_modules, venv, .git, dist, build, __pycache__, .vscode, .idea
  • Archivos: package-lock.json, yarn.lock, pnpm-lock.yaml

================================================================================

ESTE ARCHIVO CONTIENE TODA LA LOGICA DEL FRONTEND DEL PORTAL WEB ALUMNI REALIZADO EN REACT


"""
        f.write(guia)
        f.write("\n" + "="*80 + "\n")
        f.write("SECCIÓN 1: Estructura en guiones\n")
        f.write("="*80 + "\n\n")
        f.write(imprimir_guiones(estructura_src))
        f.write("\n" + "="*80 + "\n")
        f.write("SECCIÓN 2: Estructura en JSON\n")
        f.write("="*80 + "\n\n")
        f.write(json.dumps(estructura_src, indent=4, ensure_ascii=False))
        f.write("\n\n" + "="*80 + "\n")
        f.write("SECCIÓN 3: Estructura con análisis de dependencias\n")
        f.write("="*80 + "\n\n")
        if INCLUIR_CONTENIDO_ARCHIVOS:
            f.write("[MODO: Incluye contenido de archivos]\n\n")
        f.write(imprimir_guiones_con_usado_por(estructura_src, "", 0, archivos_lista, ruta_base))

    print(f"¡Archivo {NOMBRE_ARCHIVO_SALIDA}.txt generado con dependencias de importacion (usado_por)!")
    print(f"Archivo guardado en: {archivo_salida}")
    print(f"Ruta base analizada: {ruta_base}")


if __name__ == "__main__":
    main()
