# EzBOQ — Web App Project Guide

## Overview
EzBOQ = Easy Business Online & Quality — เว็บใบเสนอราคา + Business Platform

## Tech Stack
- React + Vite + TailwindCSS + Radix UI
- Firebase (ezdoc-v1-th) — Auth, Firestore, Functions, Hosting
- Node 22 Functions

## Domain
- https://ezboq.com (Cloudflare Flexible SSL → Nginx → VPS)
- Firebase: https://ezdoc-v1-th.web.app

## Structure
apps/web/ — EzBOQ frontend (React + Vite)
apps/portal/ — EzDoc (Next.js)
functions/ — Firebase Functions
shared/ — Auth, types, utils

## Brand
- Minimal cozy Japanese-inspired — ไม่ใช่ corporate tech
- สีอบอุ่น เรียบง่าย

## Vision
BOQ → PO → Shop → Invoice → Receipt
AI Jarvis สำหรับผู้รับเหมา + LINE integration

## Auto-Sync
VPS ดึงโค้ดจาก GitHub ทุก 2 นาที
แก้โค้ด push มา → VPS อัพเดทอัตโนมัติ

## Rules
- ห้าม hardcode credentials
- ห้าม force push
- อ่านไฟล์ก่อนแก้เสมอ
- ตอบภาษาไทย
