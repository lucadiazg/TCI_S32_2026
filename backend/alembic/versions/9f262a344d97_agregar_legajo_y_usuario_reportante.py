
"""Agregar legajo automático y usuario reportante.

Revision ID: 9f262a344d97
Revises: ea3d9ab69231
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Identificadores de la migración
revision: str = "9f262a344d97"
down_revision: Union[str, Sequence[str], None] = "ea3d9ab69231"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear una secuencia para generar legajos únicos
    # desde 00001 hasta 99999.
    op.execute("""
        CREATE SEQUENCE usuarios_legajo_seq
        START WITH 1
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 99999
        NO CYCLE
    """)

    # 2. Agregar la columna legajo inicialmente vacía
    op.add_column(
        "usuarios",
        sa.Column(
            "legajo",
            sa.String(length=5),
            nullable=True
        )
    )

    # 3. Asignar legajos a los usuarios existentes
    op.execute("""
        UPDATE usuarios
        SET legajo = lpad(
            nextval('usuarios_legajo_seq')::text,
            5,
            '0'
        )
        WHERE legajo IS NULL
    """)

    # 4. Configurar la generación automática para
    # los nuevos usuarios
    op.alter_column(
        "usuarios",
        "legajo",
        server_default=sa.text(
            "lpad(nextval('usuarios_legajo_seq')::text, 5, '0')"
        )
    )

    # 5. Hacer obligatorio el legajo
    op.alter_column(
        "usuarios",
        "legajo",
        existing_type=sa.String(length=5),
        nullable=False
    )

    # 6. Impedir legajos duplicados
    op.create_index(
        "ix_usuarios_legajo",
        "usuarios",
        ["legajo"],
        unique=True
    )

    # 7. Validar que el legajo tenga exactamente
    # cinco dígitos numéricos
    op.create_check_constraint(
        "ck_usuarios_legajo_formato",
        "usuarios",
        "legajo ~ '^[0-9]{5}$'"
    )

    # 8. Agregar el usuario que reportó la incidencia
    op.add_column(
        "incidencias",
        sa.Column(
            "usuario_reportante_id",
            sa.Integer(),
            nullable=True
        )
    )

    # 9. Crear la relación entre incidencias y usuarios
    op.create_foreign_key(
        "fk_incidencias_usuario_reportante",
        "incidencias",
        "usuarios",
        ["usuario_reportante_id"],
        ["id"]
    )


def downgrade() -> None:
    # 1. Eliminar la relación entre incidencias y usuarios
    op.drop_constraint(
        "fk_incidencias_usuario_reportante",
        "incidencias",
        type_="foreignkey"
    )

    # 2. Eliminar el campo usuario_reportante_id
    op.drop_column(
        "incidencias",
        "usuario_reportante_id"
    )

    # 3. Eliminar la validación del formato del legajo
    op.drop_constraint(
        "ck_usuarios_legajo_formato",
        "usuarios",
        type_="check"
    )

    # 4. Eliminar el índice único del legajo
    op.drop_index(
        "ix_usuarios_legajo",
        table_name="usuarios"
    )

    # 5. Eliminar la columna legajo
    op.drop_column(
        "usuarios",
        "legajo"
    )

    # 6. Eliminar la secuencia de legajos
    op.execute("DROP SEQUENCE usuarios_legajo_seq")
