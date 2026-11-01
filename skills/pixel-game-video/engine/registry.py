"""Availability rules shared by runtime validation and capability discovery."""

UNAVAILABLE_STATUSES = frozenset({'planned', 'draft', 'unavailable', 'not_implemented'})


def is_available(record):
    return record is not None and record.get('status') not in UNAVAILABLE_STATUSES
