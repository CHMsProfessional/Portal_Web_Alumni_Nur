# Content/permissions/Allowed.py
from rest_framework.permissions import BasePermission


class Allowed(BasePermission):
    def has_permission(self, request, view):
        return True