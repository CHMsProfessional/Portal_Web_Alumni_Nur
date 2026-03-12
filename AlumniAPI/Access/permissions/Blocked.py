from rest_framework.permissions import BasePermission


class isBlocked(BasePermission):
    def has_permission(self, request, view):
        return False
