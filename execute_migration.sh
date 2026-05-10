#!/bin/bash
npx prisma migrate resolve --applied 0_init || true
npx prisma db push
