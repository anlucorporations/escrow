#!/usr/bin/env python3
"""
generate_manuals_pdf.py — Generador Profesional de Manuales en PDF para TrueKeat.
Convierte la documentación y tutoriales en Markdown a documentos PDF profesionales
con diseño corporativo TrueKeate 2.0 (Deep Navy, Teal, Gold), tablas, diagramas y encabezados.
"""

import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted
)
from reportlab.pdfgen import canvas

# Paleta de Colores Oficial TrueKeate 2.0
COLOR_NAVY_DARK = colors.HexColor("#0A1128")
COLOR_NAVY = colors.HexColor("#1A2B4C")
COLOR_NAVY_LIGHT = colors.HexColor("#283B60")
COLOR_TEAL = colors.HexColor("#2A9D8F")
COLOR_TEAL_LIGHT = colors.HexColor("#E6F6F4")
COLOR_GOLD = colors.HexColor("#D4AF37")
COLOR_GOLD_LIGHT = colors.HexColor("#FCF8EB")
COLOR_BG = colors.HexColor("#F8F9FA")
COLOR_BORDER = colors.HexColor("#E2E8F0")
COLOR_TEXT = colors.HexColor("#1A2B4C")
COLOR_TEXT_MUTED = colors.HexColor("#64748B")
COLOR_ALERT_BG = colors.HexColor("#FFF7ED")
COLOR_ALERT_BORDER = colors.HexColor("#F97316")

class NumberedCanvas(canvas.Canvas):
    """Canvas con numeración dinámica de páginas 'Página X de Y' y encabezado corporativo."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        
        # Omitir encabezado en la portada (página 1)
        if self._pageNumber > 1:
            # Encabezado superior
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_NAVY)
            self.drawString(54, 750, "TRUEKEAT PROTOCOL — MANUAL OFICIAL DE USUARIO & DESARROLLO")
            self.setFont("Helvetica", 8)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawRightString(612 - 54, 750, "v2.0 · Web3 Escrow")
            
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.75)
            self.line(54, 742, 612 - 54, 742)

        # Pie de página (todas las páginas)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.75)
        self.line(54, 45, 612 - 54, 45)

        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(54, 32, "TrueKeat ☑ · Plataforma de Custodia Atómica, RWA & Reputación Web3")
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(612 - 54, 32, page_text)

        self.restoreState()


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=COLOR_NAVY,
        spaceAfter=15,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='DocSubTitle',
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=COLOR_TEAL,
        spaceAfter=25,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='CoverTag',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=COLOR_GOLD,
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='SectionH1',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=COLOR_NAVY,
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SectionH2',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_NAVY_LIGHT,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SectionH3',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=COLOR_TEAL,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=COLOR_TEXT,
        spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        name='CustomBullet',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_TEXT,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='AlertBox',
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=COLOR_NAVY,
        backColor=COLOR_GOLD_LIGHT,
        borderColor=COLOR_GOLD,
        borderWidth=1,
        borderPadding=8,
        spaceBefore=8,
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='CodeSnippet',
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=COLOR_NAVY_DARK,
        backColor=COLOR_BG,
        borderColor=COLOR_BORDER,
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT,
        alignment=0
    ))

    return styles


def parse_markdown_to_flowables(md_content, styles):
    flowables = []
    lines = md_content.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    while i < len(lines):
        line = lines[i]

        # Bloque de código ```
        if line.strip().startswith('```'):
            if in_code_block:
                code_text = '\n'.join(code_lines)
                flowables.append(Preformatted(code_text, styles['CodeSnippet']))
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Tablas Markdown | Col1 | Col2 |
        if line.strip().startswith('|') and '|' in line.strip()[1:]:
            # Si es línea separadora | --- | --- | la omitimos
            if re.match(r'^\s*\|(?:\s*:?-+:?\s*\|)+\s*$', line):
                i += 1
                continue
            cells = [c.strip() for c in line.strip().split('|')[1:-1]]
            if cells:
                table_rows.append(cells)
                in_table = True
            i += 1
            continue
        elif in_table:
            # Fin de la tabla
            if table_rows:
                # Renderizar tabla
                data = []
                # Cabecera
                header = [Paragraph(f"<b>{c}</b>", styles['TableHeader']) for c in table_rows[0]]
                data.append(header)
                # Filas
                for r in table_rows[1:]:
                    row_cells = [Paragraph(c, styles['TableCell']) for c in r]
                    data.append(row_cells)

                # Calcular anchos proporcionales
                col_count = len(table_rows[0])
                total_width = 504  # 612 - 108
                col_width = total_width / max(col_count, 1)

                t = Table(data, colWidths=[col_width] * col_count)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                    ('BOX', (0, 0), (-1, -1), 1, COLOR_NAVY),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG]),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ]))
                flowables.append(Spacer(1, 4))
                flowables.append(t)
                flowables.append(Spacer(1, 8))
            table_rows = []
            in_table = False

        stripped = line.strip()

        # Línea en blanco
        if not stripped:
            i += 1
            continue

        # Encabezados
        if stripped.startswith('# '):
            title_text = stripped[2:].replace('**', '').replace('*', '')
            flowables.append(Paragraph(title_text, styles['DocTitle']))
        elif stripped.startswith('## '):
            h1_text = stripped[3:].replace('**', '')
            flowables.append(Paragraph(h1_text, styles['SectionH1']))
        elif stripped.startswith('### '):
            h2_text = stripped[4:].replace('**', '')
            flowables.append(Paragraph(h2_text, styles['SectionH2']))
        elif stripped.startswith('#### '):
            h3_text = stripped[5:].replace('**', '')
            flowables.append(Paragraph(h3_text, styles['SectionH3']))
        # Listas con viñetas
        elif stripped.startswith('* ') or stripped.startswith('- '):
            bullet_text = stripped[2:]
            bullet_formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            flowables.append(Paragraph(f"• &nbsp; {bullet_formatted}", styles['CustomBullet']))
        # Listas numeradas
        elif re.match(r'^\d+\.\s+', stripped):
            match = re.match(r'^(\d+\.)\s+(.*)$', stripped)
            num_label = match.group(1)
            num_text = match.group(2)
            num_formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', num_text)
            flowables.append(Paragraph(f"<b>{num_label}</b> &nbsp; {num_formatted}", styles['CustomBullet']))
        # Callouts / Notas importantes
        elif stripped.startswith('> '):
            alert_text = stripped[2:].replace('**', '<b>').replace('**', '</b>')
            flowables.append(Paragraph(f"📌 {alert_text}", styles['AlertBox']))
        # Texto normal
        else:
            p_formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', stripped)
            p_formatted = re.sub(r'`(.*?)`', r'<font face="Courier" color="#1A2B4C">\1</font>', p_formatted)
            flowables.append(Paragraph(p_formatted, styles['CustomBody']))

        i += 1

    # Si quedó tabla pendiente al final
    if in_table and table_rows:
        data = []
        header = [Paragraph(f"<b>{c}</b>", styles['TableHeader']) for c in table_rows[0]]
        data.append(header)
        for r in table_rows[1:]:
            row_cells = [Paragraph(c, styles['TableCell']) for c in r]
            data.append(row_cells)
        col_count = len(table_rows[0])
        col_width = 504 / max(col_count, 1)
        t = Table(data, colWidths=[col_width] * col_count)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('BOX', (0, 0), (-1, -1), 1, COLOR_NAVY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        flowables.append(t)

    return flowables


def convert_md_to_pdf(md_file_path, output_pdf_path, doc_category="MANUAL OFICIAL"):
    print(f"📄 Procesando: {os.path.basename(md_file_path)} -> {os.path.basename(output_pdf_path)}")
    
    with open(md_file_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = build_styles()
    flowables = []

    # PORTADA CORPORATIVA ELEGANTE
    flowables.append(Spacer(1, 20))
    flowables.append(Paragraph("TRUEKEAT PROTOCOL — SISTEMA WEB3 DE CUSTODIA ATÓMICA & RWA", styles['CoverTag']))
    
    # Extraer título del markdown si existe
    match_title = re.search(r'^#\s+(.+)$', md_content, re.MULTILINE)
    title = match_title.group(1) if match_title else os.path.basename(md_file_path).replace('.md', '').replace('_', ' ')
    
    flowables.append(Paragraph(title, styles['DocTitle']))
    flowables.append(Paragraph(f"Documentación Oficial de Protocolo · {doc_category} · Versión 2.0", styles['DocSubTitle']))
    
    # Barra decorativa de acento dorado y verde azulado
    accent_data = [['']]
    t_accent = Table(accent_data, colWidths=[504], rowHeights=[4])
    t_accent.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_TEAL),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    flowables.append(t_accent)
    flowables.append(Spacer(1, 15))

    # Parsear cuerpo del contenido
    parsed = parse_markdown_to_flowables(md_content, styles)
    flowables.extend(parsed)

    # Compilar con NumberedCanvas
    doc.build(flowables, canvasmaker=NumberedCanvas)
    print(f"✅ Generado con éxito: {output_pdf_path}")


def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    pdf_out_dir = os.path.join(root_dir, 'docs', 'pdf')
    os.makedirs(pdf_out_dir, exist_ok=True)

    files_to_convert = [
        (
            os.path.join(root_dir, 'docs', 'manuales', 'GUIA_INICIO_RAPIDO_Y_WALLETS.md'),
            os.path.join(pdf_out_dir, 'GUIA_INICIO_RAPIDO_Y_WALLETS.pdf'),
            "GUÍA RÁPIDA & WALLETS"
        ),
        (
            os.path.join(root_dir, 'docs', 'manuales', 'TUTORIAL_OPERACION_PLATAFORMA.md'),
            os.path.join(pdf_out_dir, 'TUTORIAL_OPERACION_PLATAFORMA.pdf'),
            "TUTORIAL DE OPERACIÓN"
        ),
        (
            os.path.join(root_dir, 'docs', 'MANUAL_TECNICO.md'),
            os.path.join(pdf_out_dir, 'MANUAL_TECNICO_TRUEKEAT.pdf'),
            "MANUAL TÉCNICO & ARQUITECTURA"
        ),
        (
            os.path.join(root_dir, 'docs', 'pruebas', 'BATERIA_DE_PRUEBAS_SISTEMA.md'),
            os.path.join(pdf_out_dir, 'BATERIA_DE_PRUEBAS_SISTEMA.pdf'),
            "CERTIFICACIÓN & PRUEBAS"
        ),
        (
            os.path.join(root_dir, 'docs', 'CASOS_DE_USO_Y_DIAGRAMAS.md'),
            os.path.join(pdf_out_dir, 'CASOS_DE_USO_Y_DIAGRAMAS.pdf'),
            "CASOS DE USO & DIAGRAMAS"
        ),
        (
            os.path.join(root_dir, 'docs', 'DICCIONARIO_DE_DATOS.md'),
            os.path.join(pdf_out_dir, 'DICCIONARIO_DE_DATOS.pdf'),
            "DICCIONARIO DE DATOS ON/OFF-CHAIN"
        ),
        (
            os.path.join(root_dir, 'docs', 'INFORME_AUDITORIA_Y_OPTIMIZACION.md'),
            os.path.join(pdf_out_dir, 'INFORME_AUDITORIA_Y_OPTIMIZACION.pdf'),
            "INFORME DE AUDITORÍA & OPTIMIZACIÓN"
        ),
    ]

    print("=================================================================")
    print("  🚀 COMPILADOR PROFESIONAL DE MANUALES EN PDF — TRUEKEAT")
    print("=================================================================")
    
    for md_path, pdf_path, category in files_to_convert:
        if os.path.exists(md_path):
            convert_md_to_pdf(md_path, pdf_path, category)
        else:
            print(f"⚠️ Archivo no encontrado: {md_path}")

    print("\n🎉 Todos los manuales PDF han sido generados en docs/pdf/")


if __name__ == '__main__':
    main()
