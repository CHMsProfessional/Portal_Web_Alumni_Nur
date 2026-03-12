# Content/permissions/is_admin.py
from rest_framework.permissions import BasePermission


class isAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.auth:
            return False
        return bool(request.auth.get('is_admin', False))