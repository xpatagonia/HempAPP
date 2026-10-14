from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

class EmailNotificationRequest(BaseModel):
    to_email: str = Field(..., description="Correo destinatario del operario o socio")
    to_name: str = Field(..., description="Nombre completo del destinatario")
    notification_type: str = Field(
        ..., 
        description="Tipo de notificación: operator_invitation | agronomic_alert | labor_assigned | general"
    )
    subject: Optional[str] = None
    
    # Contexto para Invitación de Operario
    structure_name: Optional[str] = Field(None, description="Nombre de la estructura o establecimiento del socio")
    field_name: Optional[str] = Field(None, description="Nombre del campo asociado")
    role_name: Optional[str] = Field(None, description="Rol asignado dentro de la estructura")
    temp_password: Optional[str] = Field(None, description="Clave de acceso temporal")
    
    # Contexto para Alertas Agronómicas
    alert_title: Optional[str] = None
    alert_details: Optional[str] = None
    plot_name: Optional[str] = None
    
    # Contexto para Labores
    task_title: Optional[str] = None
    due_date: Optional[str] = None
    
    action_url: Optional[str] = Field("https://hempapp.onrender.com", description="Enlace al sistema")
    extra_data: Optional[Dict[str, Any]] = None

class EmailNotificationResponse(BaseModel):
    success: bool
    message: str
    sent_from: str
    sent_to: str
    delivered_via: str  # 'smtp' | 'simulated_log'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
