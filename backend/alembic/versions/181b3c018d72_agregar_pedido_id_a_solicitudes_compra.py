"""agregar pedido id a solicitudes compra

Revision ID: 181b3c018d72
Revises: f3f48a91f9e5
Create Date: 2026-11-20 03:15:01.542684

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '181b3c018d72'
down_revision: Union[str, Sequence[str], None] = 'f3f48a91f9e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    """Agrega la relación entre solicitud y pedido de compra."""

    op.add_column(
        'solicitudes_compra',
        sa.Column('pedido_id', sa.Integer(), nullable=True)
    )

    op.create_foreign_key(
        'fk_solicitudes_compra_pedido_id',
        'solicitudes_compra',
        'pedidos_compra',
        ['pedido_id'],
        ['id']
    )


def downgrade() -> None:
    """Elimina la relación entre solicitud y pedido de compra."""

    op.drop_constraint(
        'fk_solicitudes_compra_pedido_id',
        'solicitudes_compra',
        type_='foreignkey'
    )

    op.drop_column(
        'solicitudes_compra',
        'pedido_id'
    )
