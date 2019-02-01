#ifndef XDEBUG_TRACE_FRACKER_H
#define XDEBUG_TRACE_FRACKER_H

#include "xdebug_tracing.h"

typedef struct _xdebug_trace_fracker_context
{
    int socket_fd;
} xdebug_trace_fracker_context;

extern xdebug_trace_handler_t xdebug_trace_handler_fracker;
#endif
