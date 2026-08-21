#!/usr/bin/env python
"""Seed script to create 3 user accounts with the same password."""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from config.settings import settings

USERS = [
    {"usuario": "maitetobal", "mail": "maitetobal@zeroohms.com.ar"},
    {"usuario": "emilianomontero", "mail": "emilianomontero@zeroohms.com.ar"},
    {"usuario": "gaelschenone", "mail": "gaelschenone@zeroohms.com.ar"},
]

PASSWORD = "zeroohms2026"

def main():
    # Hash password using bcrypt directly
    password_bytes = PASSWORD.encode('utf-8')
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    hashed_str = hashed.decode('utf-8')
    print(f"Password hash: {hashed_str}")
    
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    
    with Session(engine) as db:
        # Check existing users
        existing = db.execute(text("SELECT Usuario, Mail FROM Usuarios")).fetchall()
        existing_usernames = {row[0] for row in existing}
        existing_emails = {row[1] for row in existing}
        
        print("Existing users:", existing_usernames)
        print("Existing emails:", existing_emails)
        
        created = 0
        for user in USERS:
            if user["usuario"] in existing_usernames:
                print(f"⚠️  User {user['usuario']} already exists, skipping")
                continue
            if user["mail"] in existing_emails:
                print(f"⚠️  Email {user['mail']} already exists, skipping {user['usuario']}")
                continue
            
            db.execute(
                text("INSERT INTO Usuarios (Usuario, Mail, Clave) VALUES (:usuario, :mail, :clave)"),
                {"usuario": user["usuario"], "mail": user["mail"], "clave": hashed_str}
            )
            print(f"✅ Created user: {user['usuario']} ({user['mail']})")
            created += 1
        
        if created > 0:
            db.commit()
            print(f"\n✅ Successfully created {created} user(s)")
        else:
            print("\nℹ️  No new users created (all already exist)")

if __name__ == "__main__":
    main()